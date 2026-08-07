"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyJobsEmployer } from "@/lib/jobs/employer";
import { sanitizeFreeText } from "@/lib/jobs/cv-conversation";
import { VACANCY_DAYS } from "@/lib/jobs/entitlements";
import { holdReasonForVacancy, logJobsModeration } from "@/lib/jobs/moderation";
import { jobsPath } from "@/lib/jobs/host";
import { isRateLimited } from "@/lib/rate-limit";
import {
  tidyVacancyWording,
  type VacancyWordingInput,
  type VacancyWordingOutput,
} from "@/lib/jobs/ai-vacancy";

export type PostVacancyState = {
  error?: Record<string, string[]> & { _form?: string[] };
} | null;

// The structured post (handoff Job 6): required fields make the advert an
// advert, not a paragraph. Everything free-text runs through the ID/bank
// auto-strip; the advance-fee auto-hold runs at PUBLISH time over every
// text field, because the preview step means text can change after the
// draft is first saved.
const vacancySchema = z.object({
  ofoCode: z.string().regex(/^\d{6}$/, "Pick the kind of work from the list"),
  experienceLevel: z.enum(["new_starter", "experienced", "senior", "management", "executive"], {
    message: "Pick the level",
  }),
  title: z.string().trim().min(5, "Give the job a clear title").max(90, "Keep the title under 90 characters"),
  suburb: z.string().trim().min(2, "Where is the job?"),
  province: z.string().trim().min(2, "Pick a province"),
  employmentType: z.enum(["full_time", "part_time", "contract", "temp"]),
  startsText: z.string().trim().min(2, "Say when the role starts").max(60),
  closingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a closing date")
    .refine((d) => new Date(`${d}T23:59:59`) > new Date(), "The closing date must be in the future"),
  duties: z.string().trim().min(20, "List the duties and responsibilities").max(2000),
  mustHave: z.string().trim().min(10, "List what is non-negotiable").max(1500),
  niceToHave: z.string().trim().max(1500).optional().or(z.literal("")),
  qualifications: z.string().trim().min(2, "Say what qualifications are required, or 'None'").max(1000),
  selectionProcess: z
    .string()
    .trim()
    .min(10, "Tell applicants what the selection process looks like")
    .max(1500),
  payText: z.string().trim().max(80).optional().or(z.literal("")),
  salaryPublic: z.enum(["true", "false"]),
});

function cleanFields(v: z.infer<typeof vacancySchema>) {
  const s = (t: string | undefined | null) => (t ? sanitizeFreeText(t).text : null);
  return {
    ofo_occupation_code: v.ofoCode,
    experience_level: v.experienceLevel,
    title: sanitizeFreeText(v.title).text,
    suburb: v.suburb,
    province: v.province,
    employment_type: v.employmentType,
    starts_text: s(v.startsText),
    closing_date: v.closingDate,
    duties: s(v.duties),
    must_have: s(v.mustHave),
    nice_to_have: s(v.niceToHave || null),
    qualifications: s(v.qualifications),
    selection_process: s(v.selectionProcess),
    pay_text: s(v.payText || null),
    salary_public: v.salaryPublic === "true",
    // The public detail page still renders `description`; keep it as the
    // duties text so older rendering paths never show an empty advert.
    description: s(v.duties) ?? "",
  };
}

function parseForm(formData: FormData) {
  return vacancySchema.safeParse({
    ofoCode: formData.get("ofoCode"),
    experienceLevel: formData.get("experienceLevel"),
    title: formData.get("title"),
    suburb: formData.get("suburb"),
    province: formData.get("province"),
    employmentType: formData.get("employmentType"),
    startsText: formData.get("startsText"),
    closingDate: formData.get("closingDate"),
    duties: formData.get("duties"),
    mustHave: formData.get("mustHave"),
    niceToHave: formData.get("niceToHave") ?? "",
    qualifications: formData.get("qualifications"),
    selectionProcess: formData.get("selectionProcess"),
    payText: formData.get("payText") ?? "",
    salaryPublic: formData.get("salaryPublic") ?? "true",
  });
}

/**
 * Saves the post as a DRAFT and sends the employer to the preview, where
 * they see the advert exactly as an applicant will before anything goes
 * live (handoff Job 6). Editing an existing draft passes vacancyId.
 */
export async function saveVacancyDraft(
  _prev: PostVacancyState,
  formData: FormData,
): Promise<PostVacancyState> {
  const employer = await getMyJobsEmployer();
  if (!employer) return { error: { _form: ["Log in first."] } };

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const fields = cleanFields(parsed.data);
  const admin = createAdminClient();
  const vacancyId = String(formData.get("vacancyId") ?? "");

  if (/^[0-9a-f-]{36}$/.test(vacancyId)) {
    const { error } = await admin
      .from("jobs_vacancies")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", vacancyId)
      .eq("employer_id", employer.id)
      .in("status", ["draft", "held"]);
    if (error) {
      console.error("Failed to update vacancy draft", error);
      return { error: { _form: ["Could not save that. Please try again."] } };
    }
    redirect(await jobsPath(`/employer/post/preview/${vacancyId}`));
  }

  const { data: created, error } = await admin
    .from("jobs_vacancies")
    .insert({
      employer_id: employer.id,
      ...fields,
      status: "draft",
      // A draft's expiry is set at publish time; this placeholder keeps
      // the not-null column satisfied and is never shown.
      expires_at: new Date(Date.now() + VACANCY_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("Failed to create vacancy draft", error);
    return { error: { _form: ["Could not save that. Please try again."] } };
  }

  redirect(await jobsPath(`/employer/post/preview/${created.id}`));
}

/**
 * The publish gate. Entitlement re-checked here (a draft is free to
 * write; going live is what spends a post), and the advance-fee auto-hold
 * runs over the final text.
 */
export async function publishVacancy(formData: FormData): Promise<void> {
  const vacancyId = String(formData.get("vacancyId") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(vacancyId)) return;

  const employer = await getMyJobsEmployer();
  if (!employer) redirect(await jobsPath("/employers"));

  if (!employer.entitlement.canPostNow) {
    redirect(await jobsPath("/employer/upgrade"));
  }

  const admin = createAdminClient();
  const { data: draft } = await admin
    .from("jobs_vacancies")
    .select("id, title, duties, must_have, nice_to_have, qualifications, selection_process, pay_text, description, status")
    .eq("id", vacancyId)
    .eq("employer_id", employer.id)
    .maybeSingle();

  if (!draft || !["draft", "closed", "expired"].includes(draft.status)) {
    redirect(await jobsPath("/employer"));
  }

  const heldReason = holdReasonForVacancy({
    title: draft.title,
    description: [draft.duties, draft.must_have, draft.nice_to_have, draft.qualifications, draft.selection_process, draft.description]
      .filter(Boolean)
      .join("\n"),
    payText: draft.pay_text,
  });

  const { error } = await admin
    .from("jobs_vacancies")
    .update({
      status: heldReason ? "held" : "published",
      held_reason: heldReason,
      expires_at: new Date(Date.now() + VACANCY_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", draft.id);

  if (error) {
    console.error("Failed to publish vacancy", error);
    redirect(await jobsPath(`/employer/post/preview/${draft.id}`));
  }

  // "Once ever" survives the vacancy row's own purge only through this
  // stamp (see entitlements.ts). Held posts spend it too: a held post is
  // a submitted post, and unheld ones must not be free retries.
  if (employer.entitlement.source === "free") {
    await admin
      .from("jobs_employers")
      .update({ free_post_used_at: new Date().toISOString() })
      .eq("id", employer.id)
      .is("free_post_used_at", null);
  }

  if (heldReason) {
    await logJobsModeration({
      targetType: "vacancy",
      targetId: draft.id,
      action: "held",
      rule: "candidate_pays_hold",
      actor: { kind: "system" },
      note: heldReason,
    });
    redirect(await jobsPath(`/employer/post/preview/${draft.id}?held=1`));
  }

  redirect(await jobsPath("/employer?published=1"));
}

/**
 * The employer-side Write with AI, same restate-only rules as the CV
 * side. Applied to the form fields client-side where the employer keeps
 * editing; publish still goes through the preview. Rate limited per
 * account: the employer side pays, so a daily allowance rather than a
 * lifetime cap.
 */
export async function tidyVacancyFields(fields: VacancyWordingInput): Promise<
  { fields: VacancyWordingOutput } | { error: string }
> {
  const employer = await getMyJobsEmployer();
  if (!employer) return { error: "Log in first." };

  if (isRateLimited(`jobs-vacancy-ai:${employer.id}`, 10, 24 * 60 * 60 * 1000)) {
    return { error: "You have used today's wording help. Try again tomorrow." };
  }

  const result = await tidyVacancyWording(fields);
  if (!result) return { error: "The wording help did not work this time. Please try again in a moment." };
  return { fields: result };
}

/** "Position filled" from the dashboard: closed, not deleted -- the
 * employer can repost it later without retyping everything. */
export async function closeVacancy(formData: FormData): Promise<void> {
  const vacancyId = String(formData.get("vacancyId") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(vacancyId)) return;

  const employer = await getMyJobsEmployer();
  if (!employer) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("jobs_vacancies")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .eq("id", vacancyId)
    .eq("employer_id", employer.id)
    .eq("status", "published");
  if (error) console.error("Failed to close vacancy", error);

  redirect(await jobsPath("/employer"));
}
