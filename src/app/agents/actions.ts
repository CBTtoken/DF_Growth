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
    return { error: { _form: ["Too many attempts, please wait a few minutes and try again."] } };
  }

  const turnstileOk = await verifyTurnstileToken(String(formData.get("turnstileToken") ?? ""), ip);
  if (!turnstileOk) {
    return { error: { _form: ["Verification failed, please try again."] } };
  }

  const parsed = agentApplicationSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    whatsappNumber: formData.get("whatsappNumber"),
    townOrArea: formData.get("townOrArea"),
    firstThreeBusinesses: formData.get("firstThreeBusinesses"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const admin = createAdminClient();
  // Phase 3: the four retired Facebook-era columns are not written at all
  // any more. They keep the answers the three existing agents gave, and
  // the migration drops their NOT NULL so this insert can omit them.
  const { error } = await admin.from("agents").insert({
    full_name: parsed.data.fullName,
    email: parsed.data.email,
    whatsapp_number: parsed.data.whatsappNumber,
    town_or_area: parsed.data.townOrArea,
    first_three_businesses: parsed.data.firstThreeBusinesses,
  });

  if (error) {
    console.error("Failed to create agent application", error);
    return { error: { _form: ["Something went wrong, please try again."] } };
  }

  await sendAgentApplicationReceivedEmail({ fullName: parsed.data.fullName, email: parsed.data.email });

  return { success: true };
}
