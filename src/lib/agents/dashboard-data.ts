import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAgentReferralLink } from "@/lib/agents/referral-cookie";

export type AgentReferral = {
  clientId: string;
  businessName: string;
  plan: string;
  billingCycle: string;
  signupDate: string;
  // Converted = has at least one commission_ledger row, i.e. an actual
  // qualifying (Growth/Enterprise annual) payment has cleared for them —
  // the real "did this become commission, or is it still just a signup"
  // signal Sec 9 asks for, distinct from growth_clients.status alone
  // (a Foundation trial is "active" but never converts).
  hasConverted: boolean;
  // Approximate only — the exact Paystack billing date isn't synced
  // locally (paystack_subscription_code is never populated, see the
  // webhook's own comment on why). Computed as the most recent successful
  // payment's date + 1 year for an annual plan; null for anything that
  // hasn't converted yet, since there's no payment date to project from.
  approxRenewalDate: string | null;
};

export type AgentDashboardData = {
  agentId: string;
  fullName: string;
  referralCode: string;
  referralLink: string;
  referrals: AgentReferral[];
  currentTier: 25 | 40;
  totalReferrals: number;
  totalEarned: number;
  totalPaid: number;
  totalOwed: number;
};

// Sec 9: "Agent" dashboard section — own auth.getUser() call, same
// pattern as listMyGrowthClients (dashboard/page.tsx's own comment on
// that: a no-op extra query for anyone who isn't also an agent, which is
// the overwhelming majority of logins).
export async function getMyAgentDashboardData(): Promise<AgentDashboardData | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: agent } = await admin
    .from("agents")
    .select("id, full_name, referral_code")
    .eq("user_id", user.id)
    .eq("status", "approved")
    .maybeSingle();

  if (!agent || !agent.referral_code) return null;

  const { data: referredClients } = await admin
    .from("growth_clients")
    .select("id, business_name, plan, billing_cycle, created_at")
    .eq("referred_by_agent_id", agent.id)
    .order("created_at", { ascending: false });

  const clientIds = (referredClients ?? []).map((c) => c.id);
  const { data: ledgerRows } = await admin
    .from("commission_ledger")
    .select("referred_client_id, amount_due, status, created_at")
    .eq("agent_id", agent.id)
    .in("referred_client_id", clientIds.length ? clientIds : ["00000000-0000-0000-0000-000000000000"]);

  const latestPaymentByClient = new Map<string, string>();
  let totalEarned = 0;
  let totalPaid = 0;
  const distinctConvertedClients = new Set<string>();

  for (const row of ledgerRows ?? []) {
    distinctConvertedClients.add(row.referred_client_id);
    totalEarned += Number(row.amount_due);
    if (row.status === "paid") totalPaid += Number(row.amount_due);

    const existing = latestPaymentByClient.get(row.referred_client_id);
    if (!existing || row.created_at > existing) {
      latestPaymentByClient.set(row.referred_client_id, row.created_at);
    }
  }

  const referrals: AgentReferral[] = (referredClients ?? []).map((c) => {
    const hasConverted = distinctConvertedClients.has(c.id);
    const lastPayment = latestPaymentByClient.get(c.id);
    let approxRenewalDate: string | null = null;
    if (hasConverted && lastPayment && c.billing_cycle === "annual") {
      const d = new Date(lastPayment);
      d.setFullYear(d.getFullYear() + 1);
      approxRenewalDate = d.toISOString();
    }
    return {
      clientId: c.id,
      businessName: c.business_name,
      plan: c.plan,
      billingCycle: c.billing_cycle,
      signupDate: c.created_at,
      hasConverted,
      approxRenewalDate,
    };
  });

  // Sec 6: tier is the agent's live count of ever-converted paying
  // referrals — 10 or fewer, 25%; 11 or more, 40%. Same distinct-client
  // count the webhook's own commission calculation uses.
  const currentTier: 25 | 40 = distinctConvertedClients.size > 10 ? 40 : 25;

  return {
    agentId: agent.id,
    fullName: agent.full_name,
    referralCode: agent.referral_code,
    referralLink: getAgentReferralLink(agent.referral_code),
    referrals,
    currentTier,
    totalReferrals: distinctConvertedClients.size,
    totalEarned,
    totalPaid,
    totalOwed: totalEarned - totalPaid,
  };
}
