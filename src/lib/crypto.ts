import crypto from "crypto";

// AES-256-GCM. Used only for growth_client_secrets.meta_capi_access_token_encrypted
// (CLAUDE.md Section 5.2: "never store a raw long-lived Meta access token in
// plaintext"). Output format: iv:authTag:ciphertext, all hex.
function getKey(): Buffer {
  const hex = process.env.APP_ENCRYPTION_KEY;
  if (!hex) throw new Error("Missing APP_ENCRYPTION_KEY");
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) throw new Error("APP_ENCRYPTION_KEY must be 32 bytes (64 hex chars)");
  return key;
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decrypt(payload: string): string {
  const [ivHex, authTagHex, ciphertextHex] = payload.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
