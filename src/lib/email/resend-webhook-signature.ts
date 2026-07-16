import crypto from "crypto";

// Resend webhooks are delivered via Svix, not a simple HMAC-of-body like
// Paystack/WhatsApp — a different scheme, so this is its own file rather
// than reusing src/lib/whatsapp/signature.ts. Svix's algorithm (see
// https://docs.svix.com/receiving/verifying-payloads/how-manual):
// signedContent = "{svix-id}.{svix-timestamp}.{body}", secret is
// "whsec_<base64>", signature is base64(HMAC-SHA256(base64decode(secret
// after prefix), signedContent)). The svix-signature header can carry
// multiple space-separated "v1,<sig>" values (for secret rotation) — valid
// if ANY of them match. Also rejects a timestamp more than 5 minutes old,
// standard replay-attack protection for webhook signatures.
const TOLERANCE_SECONDS = 5 * 60;

export function isValidResendWebhookSignature(
  rawBody: string,
  headers: { svixId: string | null; svixTimestamp: string | null; svixSignature: string | null }
): boolean {
  const { svixId, svixTimestamp, svixSignature } = headers;
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret?.startsWith("whsec_")) return false;

  const timestampNum = Number(svixTimestamp);
  if (!Number.isFinite(timestampNum) || Math.abs(Date.now() / 1000 - timestampNum) > TOLERANCE_SECONDS) {
    return false;
  }

  const secretBytes = Buffer.from(secret.slice("whsec_".length), "base64");
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");
  const expectedBuffer = Buffer.from(expected, "base64");

  return svixSignature.split(" ").some((entry) => {
    const [version, sig] = entry.split(",");
    if (version !== "v1" || !sig) return false;
    const providedBuffer = Buffer.from(sig, "base64");
    if (providedBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  });
}
