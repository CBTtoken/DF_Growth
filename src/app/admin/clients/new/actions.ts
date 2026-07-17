"use server";

import { redirect } from "next/navigation";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { provisionGrowthClient } from "@/lib/growth-client/provision";
import type { Tier } from "@/lib/paystack/plans";

type CreateClientState = { error?: string } | null;
const VALID_TIERS: Tier[] = ["foundation", "growth_engine", "enterprise"];

// Admin-initiated signup: for a prospect who just wants to hand over
// access and let DigitalFlyer build everything, with no self-serve
// /onboard wizard involved at all. Reuses provisionGrowthClient exactly
// like every other signup path (/pricing, agent-comped signup, the
// Paystack webhook) — same invite-email/set-password mechanism, same
// growth_members linking, same slug generation. Status always starts
// pending_intake; admin grants free access or sends a real payment link
// afterward from the new client's own detail page, once the page is built.
export async function adminCreateClient(_prevState: CreateClientState, formData: FormData): Promise<CreateClientState> {
  const adminUser = await requireAdminEmail();
  if ("error" in adminUser) return { error: "Not authorized." };

  const businessName = formData.get("businessName");
  const email = formData.get("email");
  const plan = formData.get("plan");

  if (typeof businessName !== "string" || businessName.trim().length < 2) {
    return { error: "Business name is required." };
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "A valid email is required." };
  }
  if (typeof plan !== "string" || !VALID_TIERS.includes(plan as Tier)) {
    return { error: "Invalid plan." };
  }

  const result = await provisionGrowthClient({
    businessName: businessName.trim(),
    email: email.trim(),
    plan: plan as Tier,
    status: "pending_intake",
    paystackReference: null,
    consentedAt: null,
    marketingConsent: false,
    billingCycle: "monthly",
    foundingSignupNumber: null,
  });

  if ("error" in result) return { error: result.error };

  redirect(`/admin/clients/${result.id}`);
}
