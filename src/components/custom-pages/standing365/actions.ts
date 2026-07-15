"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { standardOrderSchema, personalisedOrderSchema } from "@/lib/schemas/book-order";
import { initializeOneTimeCheckout } from "@/lib/paystack/checkout";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";

type OrderState = { error?: Record<string, string[]> & { _form?: string[] } } | null;

// STANDING365_LANDING_BUILD_SPEC_CLAUDE.md Sec 5/6: R299 + R75 delivery
// (standard) and R385 + R75 delivery (personalised), in cents — Paystack's
// transaction/initialize takes the smallest currency unit, same convention
// initializePaystackCheckout already relies on for subscription amounts.
// STANDARD_UNIT_PRICE scales with quantity below; delivery is charged once
// per order regardless of quantity — multiple copies to one address is
// genuinely one parcel, not N shipments.
const STANDARD_UNIT_PRICE = 299 * 100;
const DELIVERY_FEE = 75 * 100;
const PERSONALISED_AMOUNT = 385 * 100 + DELIVERY_FEE;

// Data isn't written to book_orders here — mirrors how a brand-new Growth
// signup's upfront payment works (src/app/api/webhooks/paystack/route.ts):
// everything the order needs travels as Paystack metadata, and the webhook
// writes the real row only once charge.success actually arrives. Writing a
// "pending" row here too would just be a second source of truth to keep in
// sync with what Paystack actually charged.
export async function submitBookOrder(
  growthClientId: string,
  edition: "standard" | "personalised",
  _prevState: OrderState,
  formData: FormData
): Promise<OrderState> {
  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`book-order:${ip}`, 10, 10 * 60 * 1000)) {
    return { error: { _form: ["Too many attempts — please wait a few minutes and try again."] } };
  }

  const raw = {
    buyerName: formData.get("buyerName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    street: formData.get("street"),
    suburb: formData.get("suburb"),
    city: formData.get("city"),
    postalCode: formData.get("postalCode"),
    marketingConsent: formData.get("marketingConsent") === "on",
    recipientName: formData.get("recipientName") || undefined,
    giftMessage: formData.get("giftMessage") || undefined,
    quantity: formData.get("quantity") || 1,
  };

  if (formData.get("legalConsent") !== "on") {
    return { error: { _form: ["Please agree to the Privacy Policy to continue."] } };
  }

  // Two fully separate branches rather than one ternary-picked schema — a
  // union of both schemas' inferred output types doesn't narrow cleanly
  // through an `"recipientName" in parsed.data` check, since zod's two
  // object types don't form a discriminated union TypeScript can key on.
  let email: string;
  let amount: number;
  const metadata: Record<string, string> = { order_type: "book_order", growth_client_id: growthClientId, edition };

  if (edition === "personalised") {
    const parsed = personalisedOrderSchema.safeParse(raw);
    if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
    email = parsed.data.email;
    amount = PERSONALISED_AMOUNT;
    Object.assign(metadata, {
      buyer_name: parsed.data.buyerName,
      phone: parsed.data.phone,
      delivery_address: JSON.stringify({
        street: parsed.data.street,
        suburb: parsed.data.suburb,
        city: parsed.data.city,
        postalCode: parsed.data.postalCode,
      }),
      marketing_consent: String(parsed.data.marketingConsent),
      recipient_name: parsed.data.recipientName,
      gift_message: parsed.data.giftMessage,
    });
  } else {
    const parsed = standardOrderSchema.safeParse(raw);
    if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
    email = parsed.data.email;
    amount = STANDARD_UNIT_PRICE * parsed.data.quantity + DELIVERY_FEE;
    Object.assign(metadata, {
      buyer_name: parsed.data.buyerName,
      phone: parsed.data.phone,
      delivery_address: JSON.stringify({
        street: parsed.data.street,
        suburb: parsed.data.suburb,
        city: parsed.data.city,
        postalCode: parsed.data.postalCode,
      }),
      marketing_consent: String(parsed.data.marketingConsent),
      quantity: String(parsed.data.quantity),
    });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  const result = await initializeOneTimeCheckout({
    email,
    amount,
    callbackUrl: `${siteUrl}/standing-365`,
    metadata,
  });

  if ("error" in result) {
    return { error: { _form: ["Could not start checkout — please try again."] } };
  }

  redirect(result.authorizationUrl);
}
