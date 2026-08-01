import "server-only";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { MoxieEdition } from "@/lib/moxie/editions";

/**
 * Who may read a given edition, and why.
 *
 * The whole rule lives here rather than in RLS policies or scattered across
 * pages, because it spans four tables and a clock. Dewald set it on
 * 1 August 2026:
 *
 *   - an edition opens to any signed-in reader once its free_from date
 *     passes, normally 60 days after publication
 *   - a member gets every edition published on or after they joined
 *   - a Smart Value Club code opens one edition on one device
 *
 * "signed in" is a real requirement on the free tier too. That was Dewald's
 * call: the editions stay reachable to Google through the article pages,
 * which carry the text rather than the designed pages.
 */
export type AccessReason =
  | "free_window"
  | "membership"
  | "purchase"
  | "access_code";

export type Access =
  | { allowed: true; reason: AccessReason }
  | { allowed: false; reason: "not_published" | "sign_in_required" | "membership_required" };

export function accessCodeCookieName(slug: string): string {
  return `moxie_code_${slug}`;
}

export async function getReader(): Promise<{ id: string; email: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  return { id: user.id, email: user.email };
}

/** An active membership, or null. Past due still reads, cancelled does not. */
export async function getMembership(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("moxie_subscriptions")
    .select("id, status, interval, started_at, current_period_end, paystack_subscription_code")
    .eq("user_id", userId)
    .in("status", ["active", "past_due"])
    .order("started_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export async function canRead(edition: MoxieEdition): Promise<Access> {
  if (edition.status !== "published" || !edition.published_at) {
    return { allowed: false, reason: "not_published" };
  }

  const reader = await getReader();

  // The access code path is checked before sign-in, because a Smart Value
  // Club member handed a code and a link should not also be made to create
  // an account to use it. The cookie is set when the code is redeemed, so
  // they are not asked again on that device for that edition.
  const jar = await cookies();
  if (jar.get(accessCodeCookieName(edition.slug))?.value === "1") {
    return { allowed: true, reason: "access_code" };
  }

  if (!reader) return { allowed: false, reason: "sign_in_required" };

  const freeFrom = edition.free_from ? new Date(edition.free_from) : null;
  if (freeFrom && freeFrom.getTime() <= Date.now()) {
    return { allowed: true, reason: "free_window" };
  }

  const membership = await getMembership(reader.id);
  if (membership) {
    // The rule that makes started_at immovable: a member gets editions
    // published on or after the day they joined, never the back catalogue
    // by virtue of joining today.
    const joined = new Date(membership.started_at).getTime();
    const published = new Date(edition.published_at).getTime();
    if (joined <= published) return { allowed: true, reason: "membership" };
  }

  // Nothing writes moxie_purchases today: Dewald dropped the single-issue
  // sale in favour of two membership tiers on 1 August 2026. Honoured here
  // anyway so that if a one-off sale ever returns, an existing buyer is not
  // locked out by a code path that forgot about them.
  const admin = createAdminClient();
  const { data: purchase } = await admin
    .from("moxie_purchases")
    .select("id")
    .eq("user_id", reader.id)
    .eq("edition_id", edition.id)
    .eq("status", "paid")
    .limit(1)
    .maybeSingle();
  if (purchase) return { allowed: true, reason: "purchase" };

  return { allowed: false, reason: "membership_required" };
}

/**
 * Redeems an access code for an edition.
 *
 * Marks the code used and records who used it. Rotating per edition is what
 * limits the damage when a code is shared, which it will be. This is not
 * protection and is never described as protection in the interface.
 */
export async function redeemAccessCode(
  editionId: string,
  slug: string,
  rawCode: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter the code from your Smart Value Club email." };

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("moxie_access_codes")
    .select("id, status")
    .eq("edition_id", editionId)
    .eq("code", code)
    .maybeSingle();

  // One message for "no such code" and for "revoked", so the form cannot be
  // used to work out which codes exist.
  if (!row || row.status === "revoked") {
    return { ok: false, error: "That code is not valid for this edition." };
  }

  const reader = await getReader();
  if (row.status === "unused") {
    await admin
      .from("moxie_access_codes")
      .update({
        status: "used",
        redeemed_at: new Date().toISOString(),
        redeemed_by: reader?.id ?? null,
      })
      .eq("id", row.id);
  }

  const jar = await cookies();
  jar.set(accessCodeCookieName(slug), "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  return { ok: true };
}
