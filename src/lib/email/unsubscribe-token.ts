import crypto from "crypto";

// Legacy Reactivation Sprint 2, Section 9: a real, working unsubscribe link
// needs a token that can't be forged to unsubscribe an arbitrary client_id,
// but doesn't need its own secret — reuses APP_ENCRYPTION_KEY as HMAC key
// material (same pattern as isValidWhatsAppSignature in
// src/lib/whatsapp/signature.ts), just a different cryptographic use of the
// same already-provisioned secret. Worst case of a forged token here is an
// unwanted unsubscribe, not a data exposure, so this is a proportionate
// amount of protection for what's at stake.
function getSecret(): string {
  const key = process.env.APP_ENCRYPTION_KEY;
  if (!key) throw new Error("Missing APP_ENCRYPTION_KEY");
  return key;
}

export function generateUnsubscribeToken(clientId: string): string {
  return crypto.createHmac("sha256", getSecret()).update(clientId).digest("hex");
}

export function isValidUnsubscribeToken(clientId: string, token: string): boolean {
  const expected = generateUnsubscribeToken(clientId);
  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(token, "hex");
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}
