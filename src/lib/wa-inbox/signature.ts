import crypto from "crypto";

// Meta signs every webhook POST's raw body with the app secret (HMAC
// SHA-256, header X-Hub-Signature-256, prefixed "sha256="). Checked against
// the raw bytes before any JSON.parse, same reasoning as the Paystack
// webhook's signature check. timingSafeEqual rather than a string compare so
// the comparison cannot leak through timing.
export function isValidWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !signatureHeader?.startsWith("sha256=")) return false;

  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const provided = signatureHeader.slice("sha256=".length);

  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(provided, "hex");
  if (expectedBuffer.length !== providedBuffer.length) return false;

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}
