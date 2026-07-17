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

// Fallback path: no cookie resolved an agent (different device than the
// one the link was clicked on, or no link was ever clicked), but the
// visitor typed an agent's name into the optional field themselves.
// Matches loosely against full_name — good enough for "I know Losaan
// referred me" without asking the visitor to know an exact spelling or
// code, at the cost of needing a human to resolve a genuine ambiguous
// match (two approved agents with very similar names) rather than the
// system silently guessing wrong.
async function findAgentByTypedName(typedName: string): Promise<{ id: string; email: string } | null> {
  const trimmed = typedName.trim();
  if (!trimmed) return null;

  const admin = createAdminClient();
  const { data: matches } = await admin
    .from("agents")
    .select("id, email")
    .eq("status", "approved")
    .ilike("full_name", `%${trimmed}%`);

  // Exactly one match is a real, usable signal. Zero or multiple (an
  // ambiguous partial name) isn't confident enough to auto-attribute —
  // falls through to no attribution rather than guessing.
  return matches && matches.length === 1 ? matches[0] : null;
}

// Sec 5, "Basic anti-fraud, build in from the start": resolves an
// agent_id to attribute, trying the referral cookie first and the
// visitor's typed fallback name second — or null if neither resolves, or
// the resolved agent fails an anti-fraud check. Matching is email-only for
// now — growth_clients doesn't capture a phone number at this point in
// signup (only at a later onboarding step), unlike the ecosystem's usual
// verified-email-and-phone matching convention. Not a gap that needs
// solving here; just narrower coverage than the ideal.
export async function resolveReferralAttribution({
  cookieCode,
  typedAgentName,
  signupEmail,
}: {
  cookieCode: string | undefined;
  typedAgentName?: string;
  signupEmail: string;
}): Promise<string | null> {
  const admin = createAdminClient();

  let agent: { id: string; email: string } | null = null;

  if (cookieCode) {
    const { data } = await admin
      .from("agents")
      .select("id, email")
      .eq("referral_code", cookieCode)
      .eq("status", "approved")
      .maybeSingle();
    agent = data;
  }

  if (!agent && typedAgentName) {
    agent = await findAgentByTypedName(typedAgentName);
  }

  if (!agent) return null;

  return (await passesAntiFraudChecks(agent, signupEmail)) ? agent.id : null;
}
