"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sanitizeFreeText } from "@/lib/jobs/cv-conversation";
import { getDraftCandidateId, clearDraftCandidateId } from "@/lib/jobs/draft-session";

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

/**
 * Taking the CV built before logging in and making it the real one.
 *
 * Only reachable when the person has both: a saved CV on their account and
 * an unclaimed draft behind this browser's cookie. The dashboard shows
 * both and they choose. We never choose for them, because the wrong guess
 * destroys work either way.
 *
 * The old CV is soft-deleted rather than hard-deleted, so a mistake here
 * is recoverable from the database rather than gone for good. Applications
 * already sent are untouched: they point at the old candidate row, and the
 * employer keeps seeing the CV as it was when it was sent, which is the
 * honest record of what they were offered.
 */
export async function useDraftInstead(): Promise<void> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const draftId = await getDraftCandidateId();
  if (!draftId) return;

  const admin = createAdminClient();

  // Re-check it is still unclaimed before doing anything irreversible.
  const { data: draft } = await admin
    .from("jobs_candidates")
    .select("id")
    .eq("id", draftId)
    .is("owner_user_id", null)
    .is("deleted_at", null)
    .maybeSingle();
  if (!draft) {
    await clearDraftCandidateId();
    return;
  }

  const { data: owned } = await admin
    .from("jobs_candidates")
    .select("id")
    .eq("owner_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  // The old CV must release its ownership before the new one can take it:
  // jobs_candidates.owner_user_id is UNIQUE, one CV per login. Soft
  // deleting it alone leaves the id occupied, so the claim below fails and
  // the person is left owning nothing. Nulling it here is what frees the
  // slot; the row itself survives, so a mistake is recoverable from the
  // database rather than gone.
  if (owned) {
    await admin
      .from("jobs_candidates")
      .update({ deleted_at: new Date().toISOString(), listed: false, owner_user_id: null })
      .eq("id", owned.id);
  }

  const { data: adopted, error } = await admin
    .from("jobs_candidates")
    .update({ owner_user_id: user.id, updated_at: new Date().toISOString() })
    .eq("id", draftId)
    .is("owner_user_id", null)
    .select("id")
    .maybeSingle();

  // Put the old CV back rather than leave them with none. This should not
  // happen, but "should not" is how the first version lost people's CVs.
  if (error || !adopted) {
    console.error("Failed to adopt draft CV, restoring the previous one", error);
    if (owned) {
      await admin
        .from("jobs_candidates")
        .update({ deleted_at: null, owner_user_id: user.id })
        .eq("id", owned.id);
    }
    return;
  }

  await clearDraftCandidateId();
  revalidatePath("/jobs/dashboard");
}

/** Keep the saved CV and let the unfinished one go. Only forgets the cookie. */
export async function discardDraft(): Promise<void> {
  await clearDraftCandidateId();
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
