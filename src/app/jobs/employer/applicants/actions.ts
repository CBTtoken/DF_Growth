"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyJobsEmployer } from "@/lib/jobs/employer";
import { sanitizeFreeText } from "@/lib/jobs/cv-conversation";
import { MESSAGE_MAX, sendMessageAlert } from "@/lib/jobs/messages";

// 'withdrawn' is deliberately not here: it is the seeker's own word for
// pulling out, and an employer must never be able to set it on somebody
// else's behalf.
const APPLICATION_STATUSES = ["new", "reviewing", "shortlisted", "declined"] as const;

/**
 * Move an applicant along the pipe (new -> reviewing -> shortlisted /
 * declined). Ownership is the employer_id on the application row itself,
 * re-checked here -- a form can name any id, the update only lands on
 * rows this login's employer account owns.
 */
export async function setApplicationStatus(formData: FormData): Promise<void> {
  const applicationId = String(formData.get("applicationId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!APPLICATION_STATUSES.includes(status as (typeof APPLICATION_STATUSES)[number])) return;

  const employer = await getMyJobsEmployer();
  if (!employer) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("jobs_applications")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", applicationId)
    .eq("employer_id", employer.id);
  if (error) console.error("Failed to update application status", error);

  revalidatePath("/jobs/employer/applicants");
}

/**
 * The employer writing to an applicant.
 *
 * Dewald: "maybe we should enable a messaging option, employer can message
 * the seeker, sorry it was not a fit, or could you please supply us with
 * more information."
 *
 * Scoped to an application this employer owns, so this can never become a
 * channel to somebody who has not applied to them. That is the whole
 * safety design: the person chose to be contacted by this business when
 * they applied, and by nobody else.
 */
export async function sendEmployerMessage(formData: FormData): Promise<void> {
  const applicationId = String(formData.get("applicationId") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(applicationId)) return;

  const raw = String(formData.get("body") ?? "").trim().slice(0, MESSAGE_MAX);
  if (!raw) return;
  // Same auto-strip as every free-text field: an employer asking for an ID
  // number in a message is exactly what this product promises not to do.
  const body = sanitizeFreeText(raw).text;

  const employer = await getMyJobsEmployer();
  if (!employer) return;

  const admin = createAdminClient();
  const { data: application } = await admin
    .from("jobs_applications")
    .select("id, vacancy_title, candidate_id, jobs_candidates(full_name, email)")
    .eq("id", applicationId)
    .eq("employer_id", employer.id)
    .maybeSingle();

  if (!application) return;

  const { data: created, error } = await admin
    .from("jobs_application_messages")
    .insert({ application_id: applicationId, sender_role: "employer", body })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to send employer message", error);
    return;
  }

  const candidate = application.jobs_candidates as unknown as {
    full_name: string | null;
    email: string | null;
  } | null;

  if (created?.id && candidate?.email) {
    const alert = await sendMessageAlert({
      to: candidate.email,
      toName: candidate.full_name?.trim().split(" ")[0] ?? "there",
      fromName: employer.businessName,
      vacancyTitle: application.vacancy_title,
      body,
      forRole: "candidate",
      applicationId,
    });
    if (alert.ok) {
      await admin
        .from("jobs_application_messages")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", created.id);
    }
  }

  revalidatePath("/jobs/employer/applicants");
}

/** Save or unsave a candidate for later, from any full-record view. */
export async function toggleSavedCandidate(formData: FormData): Promise<void> {
  const candidateId = String(formData.get("candidateId") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(candidateId)) return;

  const employer = await getMyJobsEmployer();
  if (!employer) return;

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("jobs_saved_candidates")
    .select("id")
    .eq("employer_id", employer.id)
    .eq("candidate_id", candidateId)
    .maybeSingle();

  if (existing) {
    await admin.from("jobs_saved_candidates").delete().eq("id", existing.id);
  } else {
    const { error } = await admin
      .from("jobs_saved_candidates")
      .insert({ employer_id: employer.id, candidate_id: candidateId });
    // 23505 = double tap, already saved; nothing to do.
    if (error && error.code !== "23505") console.error("Failed to save candidate", error);
  }

  revalidatePath("/jobs/employer");
  revalidatePath("/jobs/find-people");
}
