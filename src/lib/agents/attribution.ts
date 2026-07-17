import { createAdminClient } from "@/lib/supabase/admin";

// Sec 5, "Basic anti-fraud, build in from the start": resolves a referral
// cookie into an agent_id to attribute, or null if it shouldn't count.
// Matching is email-only for now — growth_clients doesn't capture a phone
// number at this point in signup (only at a later onboarding step), unlike
// the ecosystem's usual verified-email-and-phone matching convention. Not
// a gap that needs solving here; just narrower coverage than the ideal.
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

  // Check 1: an agent's own signup can't count as their own referral.
  if (agent.email.trim().toLowerCase() === signupEmail.trim().toLowerCase()) return null;

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

  if (existingAttributed) return null;

  return agent.id;
}
