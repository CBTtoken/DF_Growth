import { createAdminClient } from "@/lib/supabase/admin";
import { getDraftCandidateId, clearDraftCandidateId } from "@/lib/jobs/draft-session";

/**
 * Rescuing a CV built before logging in.
 *
 * The gap, found by Dewald's 9 August walkthrough and confirmed against the
 * live rows: signup claims an unclaimed draft, and **login never did**. So
 * the CV you build or upload while logged out lives behind a cookie, and
 * the moment you log in to an account you already had, the app shows that
 * account's CV instead and the one you just spent ten minutes on is
 * stranded. Nothing is deleted and nothing leaks between accounts, but the
 * person is looking at an emptier CV than the one they just filled in and
 * being told information is missing. Two of his reports ("it is mixing
 * accounts", "asking me I have missing information") are this one bug.
 *
 * It is a certainty in real use, not an edge case: build a CV, come back
 * next week, log in. That is the normal path.
 *
 * Two cases, handled differently on purpose:
 *
 * - **The account has no CV yet.** Claim the draft outright. There is
 *   nothing to lose and the person gets exactly what they expect.
 * - **The account already has a CV.** Do not touch either one. Silently
 *   overwriting somebody's saved CV with a half-finished draft would be
 *   far worse than the bug being fixed, and picking for them is not ours
 *   to do. The cookie is left in place and the dashboard offers the
 *   choice in plain words.
 */
export async function claimDraftForUser(
  userId: string,
): Promise<{ claimed: boolean; conflictDraftId?: string }> {
  const draftId = await getDraftCandidateId();
  if (!draftId) return { claimed: false };

  const admin = createAdminClient();

  const { data: owned } = await admin
    .from("jobs_candidates")
    .select("id, full_name, ofo_occupation_code")
    .eq("owner_user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  // A row that exists but has nothing in it is not a CV worth protecting.
  // startDraft() creates exactly this the moment a logged-in visitor opens
  // the builder, so treating it as real would block the claim for the most
  // common case of all.
  const ownedIsEmpty = owned && !owned.full_name?.trim() && !owned.ofo_occupation_code;

  if (owned && !ownedIsEmpty) {
    // Confirm the draft is still real and still unclaimed before offering it.
    const { data: draft } = await admin
      .from("jobs_candidates")
      .select("id")
      .eq("id", draftId)
      .is("owner_user_id", null)
      .is("deleted_at", null)
      .maybeSingle();
    if (!draft) {
      await clearDraftCandidateId();
      return { claimed: false };
    }
    return { claimed: false, conflictDraftId: draftId };
  }

  // Order matters, and getting it wrong loses the person every CV they
  // have. jobs_candidates.owner_user_id is UNIQUE (one CV per login), so
  // while the empty placeholder row still holds this user id, claiming the
  // draft violates that constraint and fails. The first version of this
  // claimed first and deleted second: the claim failed silently, the
  // placeholder was then deleted anyway, and the account was left owning
  // nothing at all. Caught by walking it; the placeholder goes first now.
  if (owned && ownedIsEmpty) {
    await admin.from("jobs_candidates").delete().eq("id", owned.id);
  }

  // The is-null check is what makes this safe: a stale or copied cookie can
  // never claim a CV that somebody already owns.
  const { data: claimed, error } = await admin
    .from("jobs_candidates")
    .update({ owner_user_id: userId, updated_at: new Date().toISOString() })
    .eq("id", draftId)
    .is("owner_user_id", null)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) console.error("Failed to claim draft CV on login", error);

  if (!claimed) {
    await clearDraftCandidateId();
    return { claimed: false };
  }

  await clearDraftCandidateId();
  return { claimed: true };
}

/**
 * The unclaimed draft still sitting behind this browser's cookie, if the
 * logged-in person already has a CV of their own. Read by the dashboard so
 * it can offer the choice rather than leaving the work stranded.
 */
export async function pendingDraftForUser(userId: string): Promise<{
  id: string;
  fullName: string | null;
  occupationTitle: string | null;
  jobCount: number;
} | null> {
  const draftId = await getDraftCandidateId();
  if (!draftId) return null;

  const admin = createAdminClient();
  const { data: draft } = await admin
    .from("jobs_candidates")
    .select("id, full_name, work_history, ofo_occupation_code, jobs_ofo_occupations(title)")
    .eq("id", draftId)
    .is("owner_user_id", null)
    .is("deleted_at", null)
    .maybeSingle();

  if (!draft) return null;

  // Nothing worth offering: an empty draft is noise on the dashboard.
  const jobCount = ((draft.work_history ?? []) as unknown[]).length;
  if (!draft.full_name?.trim() && !draft.ofo_occupation_code && jobCount === 0) return null;

  // Only meaningful while the person actually has their own CV to weigh it
  // against; otherwise claimDraftForUser would already have taken it.
  const { data: owned } = await admin
    .from("jobs_candidates")
    .select("id")
    .eq("owner_user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!owned) return null;

  return {
    id: draft.id,
    fullName: draft.full_name,
    occupationTitle:
      (draft.jobs_ofo_occupations as unknown as { title: string } | null)?.title ?? null,
    jobCount,
  };
}
