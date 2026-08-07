"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyJobsEmployer } from "@/lib/jobs/employer";

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
