"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { vacancyIsExpired } from "@/lib/jobs/entitlements";
import { jobsPath } from "@/lib/jobs/host";

/**
 * Applying through the platform (handoff Jobs 5 and 7): one tap for a
 * logged-in person with a CV. The application snapshots the vacancy title
 * and employer name so the seeker's history outlives the vacancy's 30-day
 * life, and the unique (vacancy_id, candidate_id) constraint makes a
 * double-tap a friendly no-op rather than a duplicate.
 *
 * Form action: returns void, outcomes travel as redirects. Errors that
 * need the person to do something first send them there directly (no
 * dead ends, handoff Job 8).
 */
export async function applyToVacancy(formData: FormData): Promise<void> {
  const vacancyId = String(formData.get("vacancyId") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(vacancyId)) return;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not logged in: the CV builder is the front door; it ends in signup.
  if (!user) redirect(await jobsPath("/cv"));

  const admin = createAdminClient();
  const { data: candidate } = await admin
    .from("jobs_candidates")
    .select("id, full_name, ofo_occupation_code")
    .eq("owner_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  // Logged in but no CV yet (e.g. an employer login): same front door.
  if (!candidate || !candidate.full_name) redirect(await jobsPath("/cv"));

  const { data: vacancy } = await admin
    .from("jobs_vacancies")
    .select("id, title, status, expires_at, employer_id, jobs_employers!inner(business_name)")
    .eq("id", vacancyId)
    .maybeSingle();

  if (!vacancy || vacancy.status !== "published" || vacancyIsExpired(vacancy.expires_at)) {
    redirect(await jobsPath("/vacancies"));
  }

  const employerName =
    (vacancy.jobs_employers as unknown as { business_name: string } | null)?.business_name ?? "";

  const { error } = await admin.from("jobs_applications").insert({
    vacancy_id: vacancy.id,
    candidate_id: candidate.id,
    employer_id: vacancy.employer_id,
    vacancy_title: vacancy.title,
    employer_name: employerName,
  });

  // 23505 = already applied; the dashboard shows it either way.
  if (error && error.code !== "23505") {
    console.error("Failed to create application", error);
    redirect(await jobsPath(`/vacancies/${vacancy.id}`));
  }

  redirect(await jobsPath("/dashboard?applied=1"));
}
