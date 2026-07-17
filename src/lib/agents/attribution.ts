import { createAdminClient } from "@/lib/supabase/admin";

// Hybrid fallback field (real agent feedback follow-up): the pricing page
// calls this server-side to show a confident "You were referred by
// Losaan" banner when the cookie already resolves to a real agent — the
// free-text fallback input only needs to appear when this comes back
// null, i.e. there's nothing to confirm, so ask instead.
export async function getReferredAgentDisplayName(cookieCode: string | undefined): Promise<string | null> {
  if (!cookieCode) return null;

  const admin = createAdminClient();
  const { data: agent } = await admin
    .from("agents")
    .select("full_name")
    .eq("referral_code", cookieCode)
    .eq("status", "approved")
    .maybeSingle();

  return agent?.full_name ?? null;
}

// Sec 5, "Basic anti-fraud, build in from the start" — applied identically
// regardless of which path resolved the candidate agent (cookie or typed
// name), since both are just different ways of arriving at the same
// question: should this specific signup count as this specific agent's
// referral.
async function passesAntiFraudChecks(agent: { id: string; email: string }, signupEmail: string): Promise<boolean> {
  const admin = createAdminClient();

  // Check 1: an agent's own signup can't count as their own referral.
  if (agent.email.trim().toLowerCase() === signupEmail.trim().toLowerCase()) return false;

  // Check 2: the same business (by email) can't be counted as a fresh
  // referral twice, even under a different agent's code — whichever
  // signup attempt got attributed first keeps it.
  const { data: existingAttributed } = await admin
    .from("growth_clients")
    .select("id")
    .eq("contact_email", signupEmail)
    .not("referred_by_agent_id", "is", null)
    .limit(1)
    .maybeSingle();

  return !existingAttributed;
}

// Sec 5, "Basic anti-fraud, build in from the start": resolves an
// agent_id to attribute from the referral cookie, or null if it doesn't
// resolve, or the resolved agent fails an anti-fraud check.
//
// Dewald's call, 2026-07-17: this used to also fall back to a visitor-typed
// agent name (an open free-text field on the pricing page) for the
// cross-device case a cookie alone can't catch — removed after real
// spam/junk input in that field. Admin can now assign a referring agent
// after the fact instead (AssignAgentForm, src/app/admin/clients/[id]/),
// which the commission webhook reads fresh at payment time regardless of
// how it got set, so nothing is lost, just moved to a controlled path.
export async function resolveReferralAttribution({
  cookieCode,
  signupEmail,
}: {
  cookieCode: string | undefined;
  signupEmail: string;
}): Promise<string | null> {
  if (!cookieCode) return null;

  const admin = createAdminClient();
  const { data: agent } = await admin
    .from("agents")
    .select("id, email")
    .eq("referral_code", cookieCode)
    .eq("status", "approved")
    .maybeSingle();

  if (!agent) return null;

  return (await passesAntiFraudChecks(agent, signupEmail)) ? agent.id : null;
}
