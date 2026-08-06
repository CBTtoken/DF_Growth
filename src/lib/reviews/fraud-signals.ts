import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Sec 3: never store the raw IP, only a hash of it.
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

// Public webmail providers are excluded from the shared-domain signal — a
// reviewer and a business owner both happening to use gmail.com tells you
// nothing, the whole point of that signal is a shared *private* domain
// (e.g. both @theirbusiness.co.za).
const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "live.com",
  "protonmail.com",
  "webmail.co.za",
]);

function domainOf(email: string): string {
  return email.split("@")[1]?.toLowerCase().trim() ?? "";
}

// A burst of reviews on one business in a short window is the honest,
// buildable version of "unusual velocity" (Sec 3) — flags for admin
// visibility, never blocks the submission itself.
const VELOCITY_WINDOW_MS = 15 * 60 * 1000;
const VELOCITY_THRESHOLD = 5;

export type FraudFlag = { flaggedBy: "system"; flaggedReason: string };

// Job 4 (scripts/handoff-unified-account-and-reviews.md): a review can now
// target a Growth business or, when the member has no Growth page yet, a
// KatisoBiz account directly (see reviews.bizup_account_id). Same three
// signals either way, just resolved against whichever table/column the
// review is actually being written against.
export type ReviewTarget = { businessId: string } | { bizupAccountId: string };

function targetColumn(target: ReviewTarget): "business_id" | "bizup_account_id" {
  return "businessId" in target ? "business_id" : "bizup_account_id";
}

function targetId(target: ReviewTarget): string {
  return "businessId" in target ? target.businessId : target.bizupAccountId;
}

// Sec 3's three fraud signals, checked in order of how likely each is to be
// a real problem rather than a coincidence — shared identity first (highest
// confidence), then repeat device on the same business, then velocity
// (most prone to false positives, e.g. a genuine post-launch happy-customer
// wave, so it's checked last and only after the other two have had a
// chance to explain the burst instead).
export async function evaluateFraudSignals({
  target,
  reviewerEmail,
  ipFingerprint,
}: {
  target: ReviewTarget;
  reviewerEmail: string;
  ipFingerprint: string;
}): Promise<FraudFlag | null> {
  const admin = createAdminClient();

  const ownerEmail =
    "businessId" in target
      ? (await admin.from("growth_clients").select("contact_email").eq("id", target.businessId).single()).data
          ?.contact_email
      : (await admin.from("bizup_accounts").select("email").eq("id", target.bizupAccountId).single()).data?.email;

  const reviewerDomain = domainOf(reviewerEmail);
  const businessDomain = ownerEmail ? domainOf(ownerEmail) : "";
  if (businessDomain && reviewerDomain === businessDomain && !PUBLIC_EMAIL_DOMAINS.has(reviewerDomain)) {
    return {
      flaggedBy: "system",
      flaggedReason: "Reviewer's email domain matches the business owner's contact email domain.",
    };
  }

  const column = targetColumn(target);
  const id = targetId(target);

  const { count: sameDeviceCount } = await admin
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq(column, id)
    .eq("ip_fingerprint", ipFingerprint);
  if ((sameDeviceCount ?? 0) > 0) {
    return {
      flaggedBy: "system",
      flaggedReason: "The same device/network already left a review for this business.",
    };
  }

  const windowStart = new Date(Date.now() - VELOCITY_WINDOW_MS).toISOString();
  const { count: recentCount } = await admin
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq(column, id)
    .gte("created_at", windowStart);
  if ((recentCount ?? 0) + 1 >= VELOCITY_THRESHOLD) {
    return {
      flaggedBy: "system",
      flaggedReason: `Unusual review velocity: ${(recentCount ?? 0) + 1} reviews on this business in the last 15 minutes.`,
    };
  }

  return null;
}
