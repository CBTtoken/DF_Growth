import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";

/**
 * Bob Pay, the member's own gateway (Handoff Sec 2.1). Same law as
 * gateway.ts: every call authenticates with the member's own API key, the
 * money lands in the member's own Bob Pay account, and no platform
 * credential exists on this path.
 *
 * Endpoints per api-docs.bob.co.za/bobpay, read at build time (5 Aug 2026):
 *  - POST {base}/v2/payments/intents/signature  -> returns the signature
 *  - POST {base}/v2/payments/intents/link       -> returns the payment URL
 *  - GET  {base}/v2/payments/intents            -> query payment records
 *  - POST {base}/v2/payments/intents/validate   -> confirms a notification
 *    payload really came from Bob Pay (Sec 2.1: "verify payment status
 *    against their API on webhook receipt rather than trusting the webhook
 *    payload alone")
 *  - POST {base}/v2/payments/reversal           -> refund by payment id
 *
 * Sandbox and production differ only by base URL and key, so the member's
 * sandbox flag rides with their credentials.
 */

export type BobPayCreds = {
  apiKey: string;
  accountCode: string;
  sandbox: boolean;
};

export function bobpayBase(sandbox: boolean): string {
  return sandbox ? "https://api.sandbox.bobpay.co.za" : "https://api.bobpay.co.za";
}

/** Decrypted member credentials, or null. Never travels past this module's callers. */
export async function memberBobPayCreds(growthClientId: string): Promise<BobPayCreds | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("growth_client_secrets")
    .select("bobpay_api_key_encrypted, bobpay_account_code, bobpay_sandbox")
    .eq("growth_client_id", growthClientId)
    .maybeSingle();

  if (!data?.bobpay_api_key_encrypted || !data.bobpay_account_code) return null;
  try {
    return {
      apiKey: decrypt(data.bobpay_api_key_encrypted),
      accountCode: data.bobpay_account_code,
      sandbox: data.bobpay_sandbox ?? true,
    };
  } catch (err) {
    console.error("Could not decrypt member Bob Pay key", growthClientId, err);
    return null;
  }
}

/**
 * Proves a key works before anything is saved, and again on demand from the
 * dashboard's "Test connection". A cheap read that needs valid auth.
 */
export async function testBobPayConnection(creds: BobPayCreds): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${bobpayBase(creds.sandbox)}/v2/payments/intents?limit=1`, {
      headers: { Authorization: `Bearer ${creds.apiKey}` },
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: "Bob Pay did not accept that key. Check it was copied whole." };
    }
    if (!res.ok) {
      return { ok: false, message: `Bob Pay answered with an error (${res.status}). Try again in a minute.` };
    }
    return { ok: true, message: "Connected. Bob Pay accepted the key." };
  } catch (err) {
    console.error("Bob Pay connection test threw", err);
    return { ok: false, message: "Could not reach Bob Pay. Check your connection and try again." };
  }
}

/**
 * Starts a payment: signature first, then the link carrying it. Returns the
 * URL the buyer is redirected to. `customPaymentId` is our order id, which
 * is how the webhook and the return page find the order again.
 */
export async function startBobPayPayment({
  creds,
  customPaymentId,
  amountCents,
  itemName,
  email,
  phoneNumber,
  notifyUrl,
  successUrl,
  pendingUrl,
  cancelUrl,
}: {
  creds: BobPayCreds;
  customPaymentId: string;
  amountCents: number;
  itemName: string;
  email?: string | null;
  phoneNumber?: string | null;
  notifyUrl: string;
  successUrl: string;
  pendingUrl: string;
  cancelUrl: string;
}): Promise<{ url: string } | { error: string }> {
  const base = bobpayBase(creds.sandbox);
  const intent: Record<string, unknown> = {
    recipient_account_code: creds.accountCode,
    custom_payment_id: customPaymentId,
    amount: Math.round(amountCents) / 100,
    item_name: itemName.slice(0, 100),
    notify_url: notifyUrl,
    success_url: successUrl,
    pending_url: pendingUrl,
    cancel_url: cancelUrl,
  };
  if (email) intent.email = email;
  if (phoneNumber) intent.phone_number = phoneNumber;

  try {
    const sigRes = await fetch(`${base}/v2/payments/intents/signature`, {
      method: "POST",
      headers: { Authorization: `Bearer ${creds.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(intent),
    });
    const sig = await sigRes.json().catch(() => null);
    const signature = sig?.signature;
    if (!sigRes.ok || !signature) {
      console.error("Bob Pay signature failed", sigRes.status, JSON.stringify(sig).slice(0, 200));
      return { error: "initialize_failed" };
    }

    const linkRes = await fetch(`${base}/v2/payments/intents/link`, {
      method: "POST",
      headers: { Authorization: `Bearer ${creds.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...intent, signature }),
    });
    const link = await linkRes.json().catch(() => null);
    if (!linkRes.ok || !link?.url) {
      console.error("Bob Pay link failed", linkRes.status, JSON.stringify(link).slice(0, 200));
      return { error: "initialize_failed" };
    }
    return { url: link.url };
  } catch (err) {
    console.error("Bob Pay start threw", err);
    return { error: "initialize_failed" };
  }
}

/**
 * Asks Bob Pay directly whether a payment for this order succeeded. Used on
 * the buyer's return and as the webhook's second opinion. Never trusts a
 * redirect or a notification body on its own.
 */
export async function verifyBobPayPayment(
  creds: BobPayCreds,
  customPaymentId: string
): Promise<{ paid: boolean; paymentId: number | null; amountCents: number | null }> {
  try {
    const res = await fetch(
      `${bobpayBase(creds.sandbox)}/v2/payments/intents?statuses[]=paid&search=${encodeURIComponent(customPaymentId)}&limit=20`,
      { headers: { Authorization: `Bearer ${creds.apiKey}` } }
    );
    if (!res.ok) return { paid: false, paymentId: null, amountCents: null };
    const body = await res.json().catch(() => null);
    const rows: Array<{ id?: number; custom_payment_id?: string; amount?: number; status?: string }> = Array.isArray(body)
      ? body
      : (body?.data ?? body?.results ?? []);
    const match = rows.find((r) => r.custom_payment_id === customPaymentId);
    if (!match) return { paid: false, paymentId: null, amountCents: null };
    return {
      paid: true,
      paymentId: match.id ?? null,
      amountCents: typeof match.amount === "number" ? Math.round(match.amount * 100) : null,
    };
  } catch (err) {
    console.error("Bob Pay verify threw", err);
    return { paid: false, paymentId: null, amountCents: null };
  }
}

/**
 * Confirms a notification payload with Bob Pay itself. The payload alone
 * proves nothing; Bob Pay's answer about the payload does.
 */
export async function validateBobPayNotification(
  creds: BobPayCreds,
  payload: unknown
): Promise<boolean> {
  try {
    const res = await fetch(`${bobpayBase(creds.sandbox)}/v2/payments/intents/validate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${creds.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.error("Bob Pay validate threw", err);
    return false;
  }
}

/** Refund by Bob Pay's own payment record id. */
export async function refundBobPayPayment(
  creds: BobPayCreds,
  paymentId: number
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${bobpayBase(creds.sandbox)}/v2/payments/reversal`, {
      method: "POST",
      headers: { Authorization: `Bearer ${creds.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id: paymentId }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      console.error("Bob Pay refund failed", res.status, JSON.stringify(body).slice(0, 200));
      return { ok: false, message: `Bob Pay declined the refund (${res.status}).` };
    }
    return { ok: true, message: "Refund sent to Bob Pay." };
  } catch (err) {
    console.error("Bob Pay refund threw", err);
    return { ok: false, message: "Could not reach Bob Pay to refund. Try again." };
  }
}
