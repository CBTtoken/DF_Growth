import { createAdminClient } from "@/lib/supabase/admin";
import { bizUpEntitlementForTier } from "@/lib/bizup/entitlements";
import type { Tier } from "@/lib/paystack/plans";

// Handoff: scripts/handoff-unified-account-and-reviews.md, Job 1 Phase B.
// Handoff: scripts/handoff-activation-nudges-and-emails.md, Job 1 — the
// automatic "create a fresh account when nothing matches" branch that used
// to live here is gone. Creating a KatisoBiz account for someone who never
// asked for one puts their details into a product they didn't opt into;
// that only happens now via the explicit activation button
// (src/app/dashboard/bizup-actions.ts's activateBizUp). Linking stays
// automatic here, because matching an *existing* account to its real owner
// is a correctness fix, not a consent question.
//
// Called from onboard/actions.ts saveStep1, at the one point in the signup
// flow a phone number is actually known, and again from activateBizUp
// (to catch a match that wasn't there yet at signup time) before it falls
// back to creating. Resolves to exactly one of three outcomes and is safe
// to call repeatedly:
//
//   1. Already linked (growth_client_id set on some bizup_accounts row) —
//      nothing to do, returns immediately.
//   2. The same login already owns an unlinked KatisoBiz account — link it.
//      Deterministic, no phone needed: provisionGrowthClient's own
//      "email_exists" branch already resolved this to the same auth.users
//      row when the person used the same email on both products.
//   3. A different login's unlinked KatisoBiz account matches this
//      client's phone — link it. Covers the person who used a different
//      email per product; phone is the only thing that ties them together.
//   4. Neither — returns without creating anything. The caller decides
//      what happens next (saveStep1 does nothing further; activateBizUp
//      creates a fresh account itself).
//
// Every branch only ever sets growth_client_id / plan / plan_source. It
// never touches owner_user_id, so an existing KatisoBiz login (if it's a
// different auth.users row than the Growth login) keeps working exactly as
// it does today — nothing is repointed or revoked, nobody can be logged
// out by this function.

// Mirrors scripts/link-growth-bizup-accounts.js's normalizePhone exactly
// (same leading-0/+27/27 handling) — duplicated rather than shared because
// that script is a standalone plain-Node file outside the app's build, and
// this is ten lines not worth a cross-runtime module for.
function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("0")) digits = "27" + digits.slice(1);
  if (!digits.startsWith("27")) return null;
  if (digits.length !== 11) return null;
  return digits;
}

/** True when this call found and linked an existing account, false when there was nothing to link. */
export async function ensureLinkedBizUpAccount({
  growthClientId,
  ownerUserId,
  tier,
  phoneCandidates,
}: {
  growthClientId: string;
  ownerUserId: string;
  tier: Tier;
  phoneCandidates: (string | null | undefined)[];
}): Promise<boolean> {
  const admin = createAdminClient();

  const { data: alreadyLinked } = await admin
    .from("bizup_accounts")
    .select("id")
    .eq("growth_client_id", growthClientId)
    .maybeSingle();
  if (alreadyLinked) return true;

  const { plan, planSource } = bizUpEntitlementForTier(tier);

  const { data: byOwner } = await admin
    .from("bizup_accounts")
    .select("id")
    .eq("owner_user_id", ownerUserId)
    .is("growth_client_id", null)
    .maybeSingle();

  if (byOwner) {
    await admin
      .from("bizup_accounts")
      .update({ growth_client_id: growthClientId, plan, plan_source: planSource })
      .eq("id", byOwner.id);
    return true;
  }

  const normalized = phoneCandidates.map(normalizePhone).filter((n): n is string => Boolean(n));

  if (normalized.length > 0) {
    const { data: candidates } = await admin
      .from("bizup_accounts")
      .select("id, phone, whatsapp")
      .is("growth_client_id", null);

    const match = (candidates ?? []).find((c) => {
      const candidatePhones = [normalizePhone(c.phone), normalizePhone(c.whatsapp)];
      return candidatePhones.some((p) => p && normalized.includes(p));
    });

    if (match) {
      await admin
        .from("bizup_accounts")
        .update({ growth_client_id: growthClientId, plan, plan_source: planSource })
        .eq("id", match.id);
      return true;
    }
  }

  return false;
}
