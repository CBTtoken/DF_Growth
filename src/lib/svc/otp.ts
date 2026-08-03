import "server-only";

import crypto from "crypto";
import { createSvcClient } from "@/lib/svc/db";
import { sendOtpCode } from "@/lib/svc/sms";

/**
 * One-time codes for cell verification (signup) and cell login.
 *
 * Only a hash ever reaches the database: the plaintext code exists in
 * memory and in the delivery channel, nowhere else, which is the same rule
 * the handoff sets for passwords. Codes are six digits, expire after ten
 * minutes, and a row dies after five wrong attempts.
 */
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export type OtpPurpose = "signup" | "login";

function hashCode(cell: string, purpose: OtpPurpose, code: string): string {
  // Peppered with a server secret so a leaked table alone cannot be brute
  // forced offline in any meaningful way beyond the code's own entropy.
  const pepper = process.env.SVC_OTP_PEPPER ?? process.env.SUPABASE_SECRET_KEY ?? "";
  return crypto.createHash("sha256").update(`${cell}:${purpose}:${code}:${pepper}`).digest("hex");
}

/**
 * Creates a fresh code for the cell number, invalidating any previous
 * unconsumed ones, and hands it to the delivery interface.
 */
export async function createAndSendOtp({
  cell,
  purpose,
  email,
}: {
  cell: string;
  purpose: OtpPurpose;
  email?: string;
}): Promise<{ ok: boolean; channel?: string; error?: string }> {
  const code = crypto.randomInt(100000, 1000000).toString();
  const db = createSvcClient();

  // Previous pending codes for this cell and purpose die now, so exactly
  // one code is ever valid and a re-send cannot leave two live codes.
  await db
    .from("otp_code")
    .update({ consumed_at: new Date().toISOString() })
    .eq("cell_number", cell)
    .eq("purpose", purpose)
    .is("consumed_at", null);

  const { error } = await db.from("otp_code").insert({
    cell_number: cell,
    code_hash: hashCode(cell, purpose, code),
    purpose,
    expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
  });

  if (error) {
    console.error("Could not store OTP", error);
    return { ok: false, error: "store_failed" };
  }

  return sendOtpCode({ cell, code, email });
}

/**
 * Verifies a code and consumes it. One code, one use.
 */
export async function verifyOtp({
  cell,
  purpose,
  code,
}: {
  cell: string;
  purpose: OtpPurpose;
  code: string;
}): Promise<{ ok: boolean; error?: "invalid" | "expired" | "attempts" }> {
  const db = createSvcClient();

  const { data: row } = await db
    .from("otp_code")
    .select("id, code_hash, expires_at, attempts")
    .eq("cell_number", cell)
    .eq("purpose", purpose)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return { ok: false, error: "invalid" };

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await db.from("otp_code").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);
    return { ok: false, error: "expired" };
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    await db.from("otp_code").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);
    return { ok: false, error: "attempts" };
  }

  const match = crypto.timingSafeEqual(
    Buffer.from(row.code_hash),
    Buffer.from(hashCode(cell, purpose, code))
  );

  if (!match) {
    await db.from("otp_code").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    return { ok: false, error: "invalid" };
  }

  await db.from("otp_code").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);
  return { ok: true };
}
