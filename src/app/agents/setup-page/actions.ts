"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { agentCompedSignupSchema } from "@/lib/schemas/agents";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";
import { provisionGrowthClient } from "@/lib/growth-client/provision";

type CompedSignupState = {
  error?: Record<string, string[]> & { _form?: string[] };
} | null;

// Sec 4: an approved agent's free comped Growth page — reuses
// provisionGrowthClient exactly like Foundation's own no-payment signup
// (src/app/pricing/actions.ts), just gated on a real approved agents row
// instead of being open to anyone, and tagged is_agent_comped so
// onboard/actions.ts knows to skip the 7-day trial clock.
export async function startAgentCompedSignup(
  _prevState: CompedSignupState,
  formData: FormData
): Promise<CompedSignupState> {
  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`agent-comped-signup:${ip}`, 5, 10 * 60 * 1000)) {
    return { error: { _form: ["Too many attempts — please wait a few minutes and try again."] } };
  }

  const parsed = agentCompedSignupSchema.safeParse({
    email: formData.get("email"),
    businessName: formData.get("businessName"),
    consent: formData.get("consent"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { email, businessName } = parsed.data;
  const admin = createAdminClient();

  const { data: agent } = await admin
    .from("agents")
    .select("id, comped_client_id")
    .eq("email", email)
    .eq("status", "approved")
    .maybeSingle();

  if (!agent) {
    return { error: { _form: ["We couldn't find an approved agent application for that email."] } };
  }

  if (agent.comped_client_id) {
    return { error: { _form: ["You've already set up your comped page — check your dashboard."] } };
  }

  const result = await provisionGrowthClient({
    businessName,
    email,
    plan: "foundation",
    status: "pending_intake",
    paystackReference: null,
    consentedAt: new Date().toISOString(),
    marketingConsent: false,
    billingCycle: "monthly",
    foundingSignupNumber: null,
    isAgentComped: true,
  });

  if ("error" in result) {
    return { error: { _form: ["Could not set up your page, please try again."] } };
  }

  await admin.from("agents").update({ comped_client_id: result.id }).eq("id", agent.id);

  redirect("/agents/setup-page/started");
}
