// Legacy Reactivation Sprint 2, Section 9: "run a syntax and MX-record
// check at minimum... drop obviously dead addresses before they're ever
// attempted." Deliberately not a paid real-time verification API (Kickbox,
// ZeroBounce, etc.) — proportionate for the scale this project sends at
// today, and avoids a new vendor signup; swap in a real API later if bounce
// rates from this free check prove insufficient.
//
// Uses DNS-over-HTTPS (Google's public resolver) rather than Node's `dns`
// module. Found the hard way: raw UDP/TCP DNS queries (dns.resolveMx/
// resolve4) are blocked in at least one sandboxed tool environment this
// project's own build process runs in — every single lookup failed,
// including gmail.com, which is obviously wrong. Whether or not Vercel's
// own serverless runtime allows raw DNS, a plain HTTPS request is
// guaranteed to work in strictly more environments (including this one),
// so there's no reason to take the risk either way.
const EMAIL_SYNTAX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type VerifyResult = { valid: boolean; reason?: string };

async function hasDnsRecord(domain: string, type: "MX" | "A"): Promise<boolean> {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`, {
      headers: { accept: "application/dns-json" },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Array.isArray(data.Answer) && data.Answer.length > 0;
  } catch {
    return false;
  }
}

export async function verifyEmailAddress(email: string): Promise<VerifyResult> {
  if (!email || !EMAIL_SYNTAX.test(email)) {
    return { valid: false, reason: "invalid syntax" };
  }

  const domain = email.split("@")[1];

  if (await hasDnsRecord(domain, "MX")) return { valid: true };

  // No MX record doesn't always mean the domain can't receive mail — some
  // domains rely on an implicit MX-via-A-record. Only treat it as dead if
  // neither lookup resolves.
  if (await hasDnsRecord(domain, "A")) return { valid: true };

  return { valid: false, reason: "no MX or A record for domain" };
}
