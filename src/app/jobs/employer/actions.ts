"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyJobsEmployer } from "@/lib/jobs/employer";
import { VACANCY_DAYS } from "@/lib/jobs/entitlements";

/**
 * One-tap renew, mirroring renewBoardPost: another 30 days from now,
 * ownership checked by scoping the update to this employer's own rows.
 * Renewing also clears the reminder stamp so the next cycle's reminder
 * can send again. Void-returning, same as the Board's dashboard forms: a
 * failed renew logs server-side and the page simply doesn't change, which
 * the member reads correctly as "try again".
 */
export async function renewVacancy(vacancyId: string): Promise<void> {
  const employer = await getMyJobsEmployer();
  if (!employer) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("jobs_vacancies")
    .update({
      expires_at: new Date(Date.now() + VACANCY_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      last_renewed_at: new Date().toISOString(),
      expiry_reminder_sent_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", vacancyId)
    .eq("employer_id", employer.id)
    .in("status", ["published", "expired"]);

  if (error) console.error("Failed to renew vacancy", error);

  revalidatePath("/jobs/employer");
}

/**
 * Taking a filled or withdrawn post down early. Removed, not deleted: the
 * row survives until the cron purges expired/removed posts with a demand
 * line, so the record-keeping stays in one place.
 */
export async function removeMyVacancy(vacancyId: string): Promise<void> {
  const employer = await getMyJobsEmployer();
  if (!employer) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("jobs_vacancies")
    .update({ status: "removed", updated_at: new Date().toISOString() })
    .eq("id", vacancyId)
    .eq("employer_id", employer.id);

  if (error) console.error("Failed to remove vacancy", error);

  revalidatePath("/jobs/employer");
}
