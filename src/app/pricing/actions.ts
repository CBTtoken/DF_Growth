"use server";

import { redirect } from "next/navigation";
import { startCheckoutSchema } from "@/lib/schemas/pricing";
import { planCodeForTier, amountForTier } from "@/lib/paystack/plans";

type CheckoutState = {
  error?: {
    businessName?: string[];
    email?: string[];
    tier?: string[];
    _form?: string[];
  };
} | null;

// CLAUDE.md Section 2.1: the client picks a tier, we create a Paystack
// transaction with that tier's plan attached, and redirect to the hosted
// checkout. Paystack's webhook (not this action) does the actual
// provisioning once payment succeeds.
export async function startCheckout(
  _prevState: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  const parsed = startCheckoutSchema.safeParse({
    businessName: formData.get("businessName"),
    email: formData.get("email"),
    tier: formData.get("tier"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { businessName, email, tier } = parsed.data;
  const planCode = planCodeForTier(tier);
  const amount = await amountForTier(tier);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount,
      plan: planCode,
      currency: "ZAR",
      callback_url: `${siteUrl}/pricing/success`,
      metadata: {
        business_name: businessName,
        tier,
      },
    }),
  });

  const data = await res.json();

  if (!data.status || !data.data?.authorization_url) {
    return { error: { _form: [data.message ?? "Could not start checkout, please try again."] } };
  }

  redirect(data.data.authorization_url);
}
