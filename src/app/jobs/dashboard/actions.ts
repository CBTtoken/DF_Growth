"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sanitizeFreeText } from "@/lib/jobs/cv-conversation";

async function myCandidateId(): Promise<string | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("jobs_candidates")
    .select("id")
    .eq("owner_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  return data?.id ?? null;
}

/** Availability straight from the dashboard, no trip back into the builder. */
export async function updateAvailability(formData: FormData): Promise<void> {
  const availability = String(formData.get("availability") ?? "");
  if (!["immediately", "within_2_weeks", "one_month_notice", "flexible"].includes(availability)) return;

  const candidateId = await myCandidateId();
  if (!candidateId) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("jobs_candidates")
    .update({ availability, updated_at: new Date().toISOString() })
    .eq("id", candidateId);
  if (error) console.error("Failed to update availability", error);
  revalidatePath("/jobs/dashboard");
}

/**
 * Name, contact number and contact email, edited where the person is
 * already looking at them.
 *
 * Dewald, 7 August: "the job seeker can't edit their contact details."
 * The CV builder can now be jumped into per section, which fixes it there
 * too, but a wrong phone number is the single most costly mistake on a CV
 * and it belongs one tap from the dashboard, not behind a wizard.
 *
 * The contact email here is the one an employer is shown, which is not
 * necessarily the address used to log in: changing a login email needs
 * Supabase to re-verify the new address, and quietly cutting somebody off
 * from their own account is a far worse outcome than a stale login
 * address. Login email stays where it is.
 */
export async function updateMyDetails(formData: FormData): Promise<void> {
  const fullName = String(formData.get("fullName") ?? "").trim().slice(0, 120);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40);
  const email = String(formData.get("email") ?? "").trim().slice(0, 160);

  // Both fields matter to an employer trying to make contact, so an empty
  // one is rejected rather than saved as blank.
  if (!fullName || !phone) return;

  const candidateId = await myCandidateId();
  if (!candidateId) return;

  // The name goes through the ID/bank auto-strip, the phone deliberately
  // does not: sanitizeFreeText redacts any run of 9 to 16 digits, and
  // "0825550134" is ten. Running a phone number through it would delete
  // the one field an employer needs most. saveCvAnswer makes the same
  // distinction, for the same reason.
  const safeName = sanitizeFreeText(fullName).text;

  const admin = createAdminClient();
  const { error } = await admin
    .from("jobs_candidates")
    .update({
      full_name: safeName,
      phone,
      ...(email ? { email } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", candidateId);
  if (error) console.error("Failed to update candidate details", error);
  revalidatePath("/jobs/dashboard");
}

/** The "employers can find me" switch, the dashboard's listing control. */
export async function toggleListed(formData: FormData): Promise<void> {
  const listed = String(formData.get("listed")) === "true";

  const candidateId = await myCandidateId();
  if (!candidateId) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("jobs_candidates")
    .update({ listed, updated_at: new Date().toISOString() })
    .eq("id", candidateId);
  if (error) console.error("Failed to update listed", error);
  revalidatePath("/jobs/dashboard");
}
