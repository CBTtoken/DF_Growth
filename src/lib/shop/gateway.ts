import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import { memberBobPayCreds, startBobPayPayment, verifyBobPayPayment } from "@/lib/shop/bobpay";

/**
 * Taking a payment on the member's own gateway.
 *
 * The one rule the handoff states three separate times, and it is the rule
 * this whole file exists to keep: "Never route a member's customer payments
 * through a DigitalFlyer account. Not by default, not as a convenience, not
 * for anyone." So every call here authenticates with the member's own secret
 * key, the money lands in the member's own account, and there is no split,
 * no subaccount and no platform key anywhere on this path.
 *
 * Sprint 2 adds Bob Pay alongside this and builds the screen a member uses
 * to connect either one. Sprint 1 needs only the reading half: a checkout
 * that charges when a key is present and records an unpaid order when it is
 * not, because the second of those is the common case.
 */

/**
 * The member's key, decrypted, or null.
 *
 * Never returned any further up than the two functions below. Nothing that
 * renders needs it, and a secret that reaches a component is a secret that
 * can reach a browser.
 */
async function memberSecretKey(growthClientId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("growth_client_secrets")
    .select("paystack_secret_encrypted")
    .eq("growth_client_id", growthClientId)
    .maybeSingle();

  if (!data?.paystack_secret_encrypted) return null;

  try {
    return decrypt(data.paystack_secret_encrypted);
  } catch (err) {
    // A key that cannot be decrypted is a key that cannot be used. Logged
    // without its value, and treated as "no gateway", which drops this
    // member's checkout onto the unpaid path rather than failing the sale.
    console.error("Could not decrypt member Paystack key", growthClientId, err);
    return null;
  }
}

export type GatewayProvider = "bobpay" | "paystack";

/**
 * Which gateway this member's checkout runs on. Bob Pay wins when both are
 * connected, matching the dashboard's own recommendation (Handoff Sec 2.2:
 * one recommendation, not a menu).
 */
export async function memberGatewayProvider(growthClientId: string): Promise<GatewayProvider | null> {
  if (await memberBobPayCreds(growthClientId)) return "bobpay";
  if (await memberSecretKey(growthClientId)) return "paystack";
  return null;
}

export async function memberHasGateway(growthClientId: string): Promise<boolean> {
  return (await memberGatewayProvider(growthClientId)) !== null;
}

/**
 * Starts a payment on whichever gateway the member has, Bob Pay first.
 * `reference` is our order id on both providers (Paystack calls it
 * reference, Bob Pay calls it custom_payment_id), so the way back is the
 * same regardless of who processed the money.
 */
export async function startGatewayPayment({
  growthClientId,
  email,
  phone,
  amountCents,
  reference,
  itemName,
  returnUrl,
  notifyUrl,
}: {
  growthClientId: string;
  email: string | null;
  phone: string | null;
  amountCents: number;
  reference: string;
  itemName: string;
  returnUrl: string;
  notifyUrl: string;
}): Promise<{ provider: GatewayProvider; authorizationUrl: string } | { error: string }> {
  const bobpay = await memberBobPayCreds(growthClientId);
  if (bobpay) {
    const result = await startBobPayPayment({
      creds: bobpay,
      customPaymentId: reference,
      amountCents,
      itemName,
      email,
      phoneNumber: phone,
      notifyUrl,
      successUrl: returnUrl,
      pendingUrl: returnUrl,
      cancelUrl: returnUrl,
    });
    if ("error" in result) return result;
    return { provider: "bobpay", authorizationUrl: result.url };
  }

  if (!email) return { error: "email_required" };
  const paystack = await startMemberPayment({
    growthClientId,
    email,
    amountCents,
    reference,
    callbackUrl: returnUrl,
    metadata: { order_id: reference },
  });
  if ("error" in paystack) return paystack;
  return { provider: "paystack", authorizationUrl: paystack.authorizationUrl };
}

/**
 * Asks the order's own gateway whether it was paid. The provider the order
 * ran on is recorded on the order row; an order from before Bob Pay existed
 * has none recorded and is treated as Paystack, which is all there was.
 */
export async function verifyGatewayPayment(
  growthClientId: string,
  reference: string,
  provider: GatewayProvider | null
): Promise<{ paid: boolean; amountCents: number | null; bobpayPaymentId: number | null }> {
  if (provider === "bobpay") {
    const creds = await memberBobPayCreds(growthClientId);
    if (!creds) return { paid: false, amountCents: null, bobpayPaymentId: null };
    const result = await verifyBobPayPayment(creds, reference);
    return { paid: result.paid, amountCents: result.amountCents, bobpayPaymentId: result.paymentId };
  }
  const result = await verifyMemberPayment(growthClientId, reference);
  return { paid: result.paid, amountCents: result.amountCents, bobpayPaymentId: null };
}

/**
 * Starts a payment and hands back the URL to send the buyer to.
 *
 * `reference` is ours rather than Paystack's, so that the order row can be
 * written before the buyer leaves and found again on the way back without
 * having to match on anything a person typed. Keying the lookup on a name or
 * an email would be a bug waiting for two buyers called the same thing.
 */
export async function startMemberPayment({
  growthClientId,
  email,
  amountCents,
  reference,
  callbackUrl,
  metadata,
}: {
  growthClientId: string;
  email: string;
  amountCents: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}): Promise<{ authorizationUrl: string } | { error: string }> {
  const secret = await memberSecretKey(growthClientId);
  if (!secret) return { error: "no_gateway" };

  try {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        amount: amountCents,
        currency: "ZAR",
        reference,
        callback_url: callbackUrl,
        metadata,
      }),
    });

    const data = await res.json();
    if (!data.status || !data.data?.authorization_url) {
      // The member's key is the likely culprit and its value is never
      // logged. Whatever Paystack said about it is, because that is what
      // tells the member which of the several things went wrong.
      console.error("Member Paystack initialize failed", growthClientId, data?.message);
      return { error: "initialize_failed" };
    }
    return { authorizationUrl: data.data.authorization_url };
  } catch (err) {
    console.error("Member Paystack initialize threw", growthClientId, err);
    return { error: "initialize_failed" };
  }
}

/**
 * Asks Paystack directly whether a payment actually succeeded.
 *
 * Never trusts the browser coming back from the redirect, which is a
 * parameter in a URL bar that anybody can retype. The handoff makes the same
 * point about Bob Pay's webhook in Sec 2.1 and it applies identically here:
 * verify against their API, not against what arrived.
 */
export async function verifyMemberPayment(
  growthClientId: string,
  reference: string
): Promise<{ paid: boolean; amountCents: number | null }> {
  const secret = await memberSecretKey(growthClientId);
  if (!secret) return { paid: false, amountCents: null };

  try {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } }
    );
    const data = await res.json();
    if (!data.status || data.data?.status !== "success") return { paid: false, amountCents: null };
    return { paid: true, amountCents: data.data.amount ?? null };
  } catch (err) {
    console.error("Member Paystack verify threw", growthClientId, err);
    return { paid: false, amountCents: null };
  }
}
