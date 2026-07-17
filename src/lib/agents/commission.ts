import { createAdminClient } from "@/lib/supabase/admin";
import { sendAgentReferralConvertedEmail, sendAgentTierMilestoneEmail } from "@/lib/email/agents";

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
  // rows already on record before this one gets written. isNewConversion
  // distinguishes this specific client's *first* qualifying payment (the
  // real "referral converted" moment Sec 10's notification is about) from
  // a later payment for a client already on record — the set's own
  // membership check before adding clientId is exactly that signal.
  const distinctClients = new Set((existingRows ?? []).map((r) => r.referred_client_id));
  const isNewConversion = !distinctClients.has(clientId);
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
    return;
  }

  if (!isNewConversion) return;

  const [{ data: agent }, { data: client }] = await Promise.all([
    admin.from("agents").select("full_name, email").eq("id", referredByAgentId).single(),
    admin.from("growth_clients").select("business_name").eq("id", clientId).single(),
  ]);

  if (agent && client) {
    await sendAgentReferralConvertedEmail({
      fullName: agent.full_name,
      email: agent.email,
      referredBusinessName: client.business_name,
      ratePercent: rateApplied,
    });

    // Sec 10: fires exactly once, at the moment the 11th distinct
    // conversion crosses the threshold — every conversion after this one
    // is already at 40%, so this exact size===11 check only ever matches
    // the single crossing event, never re-fires on #12, #13, etc.
    if (distinctClients.size === 11) {
      await sendAgentTierMilestoneEmail({ fullName: agent.full_name, email: agent.email });
    }
  }
}
