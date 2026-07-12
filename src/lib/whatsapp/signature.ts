import crypto from "crypto";

// Combined spec Sec 32.1: validate X-Hub-Signature-256 on every incoming
// webhook POST, same requirement the reference standalone WhatsApp bot
// codebase follows. Meta signs the raw request body with WHATSAPP_APP_SECRET
// (HMAC SHA-256), prefixed "sha256=" — must be checked against the raw
// bytes before any JSON.parse, same reasoning as the Paystack webhook's own
// signature check (route.ts reads request.text() first, not request.json()).
// timingSafeEqual rather than a plain string compare — this is new code, no
// reason to accept a timing side-channel a bad-length compare could leak.
export function isValidWhatsAppSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = crypto
    .createHmac("sha256", process.env.WHATSAPP_APP_SECRET!)
    .update(rawBody)
    .digest("hex");

  const provided = signatureHeader.slice("sha256=".length);

  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(provided, "hex");

  if (expectedBuffer.length !== providedBuffer.length) return false;

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}
