import dns from "dns/promises";

// Legacy Reactivation Sprint 2, Section 9: "run a syntax and MX-record
// check at minimum... drop obviously dead addresses before they're ever
// attempted." Deliberately not a paid real-time verification API (Kickbox,
// ZeroBounce, etc.) — proportionate for the scale this project sends at
// today, and avoids a new vendor signup; swap in a real API later if bounce
// rates from this free check prove insufficient.
const EMAIL_SYNTAX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type VerifyResult = { valid: boolean; reason?: string };

export async function verifyEmailAddress(email: string): Promise<VerifyResult> {
  if (!email || !EMAIL_SYNTAX.test(email)) {
    return { valid: false, reason: "invalid syntax" };
  }

  const domain = email.split("@")[1];

  try {
    const mxRecords = await dns.resolveMx(domain);
    if (mxRecords.length > 0) return { valid: true };
  } catch {
    // Falls through to the A-record fallback below.
  }

  // No MX record doesn't always mean the domain can't receive mail — some
  // domains rely on an implicit MX-via-A-record. Only treat it as dead if
  // neither lookup resolves.
  try {
    const aRecords = await dns.resolve4(domain);
    if (aRecords.length > 0) return { valid: true };
  } catch {
    // Neither resolved — genuinely dead domain.
  }

  return { valid: false, reason: "no MX or A record for domain" };
}
