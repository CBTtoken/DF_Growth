import { createAdminClient } from "@/lib/supabase/admin";

// Sec 6: one ledger row per commission-earning payment. Called from the
// Paystack webhook's first-payment branch (the point that already sends
// the welcome email and fires trackBetaEvent for a pending signup's first
// successful charge) and from the plan-upgrade branch, both of which
// already know the client's resolved plan/billing cycle for this exact
// payment. Renewal-triggered calls (Sec 6: "whether it's a brand new
// referral's first payment or an existing referral's renewal") depend on
// Paystack's own recurring charge.success events reliably reaching this
// same webhook with growth_client_id intact — flagged to Dewald as
// unverified and not yet confirmed working, so this function only ever
// actually fires today on first-payment and upgrade events, not renewals.
//
// Not race-hardened against two commission events for the same agent
// landing concurrently (unlike the founding-member slot counter, which
// guards a hard global cap of 10) — acceptable at this volume; a rare
// simultaneous pair of conversions for the same agent could compute the
// tier boundary a beat early or late, never double-pay or lose a row.
export async function recordCommissionIfEligible({
  clientId,
  plan,
  billingCycle,
  referredByAgentId,
  amountKobo,
}: {
  clientId: string;
  plan: string;
  billingCycle: "monthly" | "annual";
  referredByAgentId: string | null;
  amountKobo: number;
}): Promise<void> {
  // Sec 2: Growth and Enterprise annual only, ever — never Foundation, and
  // never a monthly plan regardless of tier.
  const planQualifies = plan === "growth_engine" || plan === "enterprise";
  if (!referredByAgentId || !planQualifies || billingCycle !== "annual") return;

  const admin = createAdminClient();

  const { data: existingRows } = await admin
    .from("commission_ledger")
    .select("referred_client_id")
    .eq("agent_id", referredByAgentId);

  // Sec 6's tier count includes the referral converting right now, since
  // this payment is exactly what makes it "ever-converted" — not just the
  // rows already on record before this one gets written.
  const distinctClients = new Set((existingRows ?? []).map((r) => r.referred_client_id));
  distinctClients.add(clientId);
  const rateApplied = distinctClients.size <= 10 ? 25 : 40;

  const amountDue = (amountKobo / 100) * (rateApplied / 100);

  const { error } = await admin.from("commission_ledger").insert({
    agent_id: referredByAgentId,
    referred_client_id: clientId,
    period_year: new Date().getFullYear(),
    rate_applied: rateApplied,
    amount_due: amountDue,
    status: "pending",
  });

  if (error) {
    console.error("Failed to record commission ledger row", error, { clientId, referredByAgentId });
  }
}
