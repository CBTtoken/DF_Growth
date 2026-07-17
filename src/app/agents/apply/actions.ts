"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { agentApplicationSchema } from "@/lib/schemas/agents";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { sendAgentApplicationReceivedEmail } from "@/lib/email/agents";

type ApplyState =
  | {
      error?: Record<string, string[]> & { _form?: string[] };
      success?: boolean;
    }
  | null;

// Sec 3: "Submission creates an agents record with status = pending. No
// payment step, no account creation yet, this is an application only." No
// Supabase auth user is created here at all — unlike reviewer_accounts and
// event_organizers, an agent has no login until Sprint 2's comped account
// flow, so this is a plain admin-client insert, not the auth-signup
// pattern those two use.
export async function submitAgentApplication(_prevState: ApplyState, formData: FormData): Promise<ApplyState> {
  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`agent-apply:${ip}`, 5, 10 * 60 * 1000)) {
    return { error: { _form: ["Too many attempts — please wait a few minutes and try again."] } };
  }

  const turnstileOk = await verifyTurnstileToken(String(formData.get("turnstileToken") ?? ""), ip);
  if (!turnstileOk) {
    return { error: { _form: ["Verification failed — please try again."] } };
  }

  const parsed = agentApplicationSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    whatsappNumber: formData.get("whatsappNumber"),
    facebookPageUrl: formData.get("facebookPageUrl"),
    understandsFacebookRules: formData.get("understandsFacebookRules"),
    canGenerateContent: formData.get("canGenerateContent"),
    promotionMethod: formData.get("promotionMethod"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("agents").insert({
    full_name: parsed.data.fullName,
    email: parsed.data.email,
    whatsapp_number: parsed.data.whatsappNumber,
    facebook_page_url: parsed.data.facebookPageUrl,
    understands_facebook_rules: parsed.data.understandsFacebookRules,
    can_generate_content: parsed.data.canGenerateContent,
    promotion_method: parsed.data.promotionMethod,
  });

  if (error) {
    console.error("Failed to create agent application", error);
    return { error: { _form: ["Something went wrong, please try again."] } };
  }

  await sendAgentApplicationReceivedEmail({ fullName: parsed.data.fullName, email: parsed.data.email });

  return { success: true };
}
