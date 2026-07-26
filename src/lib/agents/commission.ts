import { createAdminClient } from "@/lib/supabase/admin";
import { sendAgentReferralConvertedEmail, sendAgentTierMilestoneEmail } from "@/lib/email/agents";
import { commissionBasis } from "@/lib/agents/vat";

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
  billingCycle,
  referredByAgentId,
  amountKobo,
}: {
  clientId: string;
  billingCycle: "monthly" | "annual";
  referredByAgentId: string | null;
  amountKobo: number;
}): Promise<void> {
  // v2 terms (docs/agent-terms-and-faq-v2.md) widened this, and the change
  // is commercial, not cosmetic. It used to be Growth and Enterprise annual
  // only: Foundation earned nothing, and monthly earned nothing ever.
  //
  // Clause 8: any yearly plan pays 25%, rising to 40% past ten yearly
  // members. Clause 9: any monthly plan pays 10%, from the first cleared
  // payment. The previous version's Foundation 10% carve-out and the three
  // month delay on monthly are both gone.
  //
  // So every plan now earns something and the only question is the rate.
  // Left as-is, this function would have kept silently recording nothing
  // for Foundation and monthly referrals while the published FAQ told
  // agents they earn on them.
  if (!referredByAgentId) return;

  const admin = createAdminClient();

  const { data: existingRows } = await admin
    .from("commission_ledger")
    .select("referred_client_id, rate_applied")
    .eq("agent_id", referredByAgentId);

  const rows = existingRows ?? [];

  // isNewConversion distinguishes this client's first commission-earning
  // payment (the real "referral converted" moment the notification is
  // about) from a later payment for a client already on record.
  const everEarned = new Set(rows.map((r) => r.referred_client_id));
  const isNewConversion = !everEarned.has(clientId);

  // v2 clause 11: the rate is worked out fresh at every payment "using how
  // many yearly members you have at that moment", and clause 9's monthly
  // members do not move you up the ladder.
  //
  // The yearly count is derived from the rate already stored on each row
  // rather than from a new column: a monthly row is 10 and a yearly row is
  // 25 or 40, so "rate is not 10" is exactly "this client earned on a
  // yearly plan". One less column to keep in sync with a rule that has
  // already changed once.
  const yearlyClients = new Set(rows.filter((r) => r.rate_applied !== 10).map((r) => r.referred_client_id));

  let rateApplied: 10 | 25 | 40;
  if (billingCycle === "annual") {
    // The count includes the member converting right now, since this
    // payment is exactly what makes them a yearly member.
    yearlyClients.add(clientId);
    rateApplied = yearlyClients.size <= 10 ? 25 : 40;
  } else {
    rateApplied = 10;
  }

  // Terms 3.6: the rate applies to the amount excluding VAT, not to what
  // the member actually paid. Identical today, since DigitalFlyer is not
  // VAT registered, and deliberately routed through the shared constant so
  // the day registration happens this does not keep quietly paying every
  // agent about 13% too much on every payment. See lib/agents/vat.ts.
  const amountDue = commissionBasis(amountKobo / 100) * (rateApplied / 100);

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

    // Fires exactly once, at the moment the 11th yearly member crosses the
    // threshold: every yearly conversion after this one is already at 40%,
    // so this exact ===11 check only ever matches the crossing event and
    // never re-fires on the 12th or 13th.
    //
    // Counts yearly members specifically now, not every conversion, since
    // v2 clause 9 means a monthly member earns commission without moving
    // the agent up the ladder. Counting all conversions here would have
    // congratulated an agent on reaching 40% while still paying them 25%.
    if (billingCycle === "annual" && yearlyClients.size === 11) {
      await sendAgentTierMilestoneEmail({ fullName: agent.full_name, email: agent.email });
    }
  }
}
