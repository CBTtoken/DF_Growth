"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { vacancyIsExpired } from "@/lib/jobs/entitlements";
import { jobsPath } from "@/lib/jobs/host";
import { sanitizeFreeText } from "@/lib/jobs/cv-conversation";
import { setApplyIntent, clearApplyIntent } from "@/lib/jobs/apply-intent";
import { sendApplicationAlert } from "@/lib/jobs/application-email";

/** A cover message is a note, not an essay. Long enough to say why you fit. */
const COVER_MESSAGE_MAX = 600;

/**
 * Applying through the platform (handoff Jobs 5 and 7, extended 9 August
 * with Dewald's cover message and employer alert).
 *
 * One tap for a logged-in person with a CV, with an optional note in their
 * own words. The application snapshots the vacancy title and employer name
 * so the seeker's history outlives the vacancy's 30-day life, and the
 * unique (vacancy_id, candidate_id) constraint makes a double-tap a
 * friendly no-op rather than a duplicate.
 *
 * Form action: returns void, outcomes travel as redirects. Somebody who
 * needs to do something first is sent to do it AND their intent is parked
 * in a cookie, so finishing that thing brings them back to this advert
 * rather than stranding them on a dashboard (no dead ends, handoff Job 8).
 */
export async function applyToVacancy(formData: FormData): Promise<void> {
  const vacancyId = String(formData.get("vacancyId") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(vacancyId)) return;

  const rawMessage = String(formData.get("coverMessage") ?? "").trim().slice(0, COVER_MESSAGE_MAX);
  // Same auto-strip as every other free-text field: an applicant who
  // helpfully types their ID number into the note must not have it stored
  // or emailed onwards.
  const coverMessage = rawMessage ? sanitizeFreeText(rawMessage).text : null;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not logged in: the CV builder is the front door and it ends in signup.
  // Remember what they were applying for on the way.
  if (!user) {
    await setApplyIntent(vacancyId);
    redirect(await jobsPath("/cv"));
  }

  const admin = createAdminClient();
  const { data: candidate } = await admin
    .from("jobs_candidates")
    .select("id, full_name, phone")
    .eq("owner_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  // Logged in but no usable CV yet (a brand-new login, or an employer
  // account). Same front door, same memory of why they went there.
  if (!candidate || !candidate.full_name) {
    await setApplyIntent(vacancyId);
    redirect(await jobsPath("/cv"));
  }

  const { data: vacancy } = await admin
    .from("jobs_vacancies")
    .select("id, title, status, expires_at, employer_id, jobs_employers!inner(business_name, email)")
    .eq("id", vacancyId)
    .maybeSingle();

  if (!vacancy || vacancy.status !== "published" || vacancyIsExpired(vacancy.expires_at)) {
    await clearApplyIntent();
    redirect(await jobsPath("/vacancies"));
  }

  const employer = vacancy.jobs_employers as unknown as { business_name: string; email: string } | null;
  const employerName = employer?.business_name ?? "";

  const { data: created, error } = await admin
    .from("jobs_applications")
    .insert({
      vacancy_id: vacancy.id,
      candidate_id: candidate.id,
      employer_id: vacancy.employer_id,
      vacancy_title: vacancy.title,
      employer_name: employerName,
      cover_message: coverMessage,
    })
    .select("id")
    .maybeSingle();

  // 23505 = already applied. Not an error worth showing: the dashboard
  // lists the application either way, which is the honest answer to
  // "did that work?".
  if (error && error.code !== "23505") {
    console.error("Failed to create application", error);
    redirect(await jobsPath(`/vacancies/${vacancy.id}`));
  }

  await clearApplyIntent();

  // The employer alert. Awaited rather than fired and forgotten, because
  // notified_at is what stops it sending twice and that only means
  // anything if the write happens. It is wrapped so that a Resend outage
  // costs the employer an email, never the applicant their application.
  if (created?.id && employer?.email) {
    try {
      const alert = await sendApplicationAlert({
        to: employer.email,
        employerName,
        applicantName: candidate.full_name,
        vacancyTitle: vacancy.title,
        coverMessage,
        applicationId: created.id,
      });
      if (alert.ok) {
        await admin
          .from("jobs_applications")
          .update({ notified_at: new Date().toISOString() })
          .eq("id", created.id);
      }
    } catch (err) {
      console.error("Application alert failed", err);
    }
  }

  redirect(await jobsPath("/dashboard?applied=1"));
}
