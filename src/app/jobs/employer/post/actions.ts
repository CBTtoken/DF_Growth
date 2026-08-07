"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyJobsEmployer } from "@/lib/jobs/employer";
import { sanitizeFreeText } from "@/lib/jobs/cv-conversation";
import { VACANCY_DAYS } from "@/lib/jobs/entitlements";
import { holdReasonForVacancy, logJobsModeration } from "@/lib/jobs/moderation";
import { jobsPath } from "@/lib/jobs/host";

export type PostVacancyState = {
  error?: Record<string, string[]> & { _form?: string[] };
  /** Set when the post went in but a rule held it for review. */
  held?: boolean;
} | null;

const vacancySchema = z.object({
  roleId: z.string().uuid().nullable(),
  otherRoleText: z.string().trim().max(80).nullable(),
  title: z.string().trim().min(5, "Give the job a clear title").max(90, "Keep the title under 90 characters"),
  description: z.string().trim().min(30, "Say a bit more about the job, at least a sentence or two").max(3000),
  suburb: z.string().trim().min(2, "Where is the job?"),
  province: z.string().trim().min(2, "Pick a province"),
  employmentType: z.enum(["full_time", "part_time", "contract", "temp"]),
  payText: z.string().trim().max(80).nullable(),
});

export async function postVacancy(_prev: PostVacancyState, formData: FormData): Promise<PostVacancyState> {
  const employer = await getMyJobsEmployer();
  if (!employer) return { error: { _form: ["Log in first."] } };

  // The entitlement is the gate, re-checked here rather than trusted from
  // the page render: a hidden button is a suggestion, a server check is a
  // rule.
  if (!employer.entitlement.canPostNow) {
    return {
      error: {
        _form: [
          employer.entitlement.lapsed
            ? "Your subscription has ended. Restart your plan to post again."
            : "You have used your available posts. Upgrade to post more.",
        ],
      },
    };
  }

  const parsed = vacancySchema.safeParse({
    roleId: String(formData.get("roleId") ?? "") || null,
    otherRoleText: String(formData.get("otherRoleText") ?? "").trim() || null,
    title: formData.get("title"),
    description: formData.get("description"),
    suburb: formData.get("suburb"),
    province: formData.get("province"),
    employmentType: formData.get("employmentType"),
    payText: String(formData.get("payText") ?? "").trim() || null,
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const v = parsed.data;

  if (!v.roleId && !v.otherRoleText) {
    return { error: { _form: ["Pick the kind of work, or type it if it is not listed."] } };
  }

  // Same ID/bank auto-strip the CV builder applies: an employer pasting a
  // description with an ID number in it is protected from themselves too.
  const title = sanitizeFreeText(v.title).text;
  const description = sanitizeFreeText(v.description).text;
  const payText = v.payText ? sanitizeFreeText(v.payText).text : null;

  const heldReason = holdReasonForVacancy({ title, description, payText });

  const admin = createAdminClient();
  const { data: created, error } = await admin
    .from("jobs_vacancies")
    .insert({
      employer_id: employer.id,
      role_id: v.roleId,
      other_role_text: v.otherRoleText,
      title,
      description,
      suburb: v.suburb,
      province: v.province,
      employment_type: v.employmentType,
      pay_text: payText,
      status: heldReason ? "held" : "published",
      held_reason: heldReason,
      expires_at: new Date(Date.now() + VACANCY_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("Failed to create vacancy", error);
    return { error: { _form: ["Could not post that. Please try again."] } };
  }

  if (heldReason) {
    await logJobsModeration({
      targetType: "vacancy",
      targetId: created.id,
      action: "held",
      rule: "candidate_pays_hold",
      actor: { kind: "system" },
      note: heldReason,
    });
    // The employer is told plainly rather than left wondering: the post
    // exists, a person will look at it. No redirect, the form shows it.
    return { held: true };
  }

  redirect(await jobsPath("/employer"));
}
