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
 * The employer's own business details.
 *
 * Dewald, 7 August: "Both dashboards has issues." The employer's half of
 * that was that nothing about the business could be changed after signup.
 * The business name is the byline on every advert and the phone number is
 * printed on the public vacancy page under "Or contact {business} on ...",
 * so a typo in either was permanent and publicly visible, with no screen
 * anywhere that could correct it.
 *
 * The contact email is where application alerts are sent, which makes it
 * the one field that silently costs the employer candidates if it is
 * wrong. Changing it here changes where alerts go; it does not change the
 * login address, for the same reason as on the seeker side.
 */
export async function updateEmployerDetails(formData: FormData): Promise<void> {
  const businessName = String(formData.get("businessName") ?? "").trim().slice(0, 120);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40);
  const email = String(formData.get("email") ?? "").trim().slice(0, 160);

  if (!businessName) return;

  const employer = await getMyJobsEmployer();
  if (!employer) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("jobs_employers")
    .update({
      business_name: businessName,
      phone: phone || null,
      ...(email ? { email } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", employer.id);

  if (error) console.error("Failed to update employer details", error);

  revalidatePath("/jobs/employer");
}

// removeMyVacancy was replaced by closeVacancy in post/actions.ts when the
// draft/closed lifecycle landed: closing keeps the post repostable, where
// "removed" is now reserved for moderation takedowns.
