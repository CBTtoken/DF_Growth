// Rate & Review Sprint 1, Sec 3: server-side half of Cloudflare Turnstile —
// the client widget (TurnstileWidget.tsx) only produces a token, this is
// what actually proves it's real. Never trust the token's mere presence,
// always verify it against Cloudflare directly.
// A Turnstile widget is locked to its hostnames, so KatisoBiz needs its own
// widget rather than reusing Growth's: they are on different domains.
// `secretEnvVar` lets a caller name which secret to verify against, and
// defaults to Growth's so every existing call site is unchanged.
export async function verifyTurnstileToken(
  token: string | null,
  remoteIp?: string,
  secretEnvVar: "TURNSTILE_SECRET_KEY" | "BIZUP_TURNSTILE_SECRET_KEY" | "JOBS_TURNSTILE_SECRET_KEY" = "TURNSTILE_SECRET_KEY",
): Promise<boolean> {
  if (!token) return false;

  const secret = process.env[secretEnvVar];
  if (!secret) {
    console.error(`Missing ${secretEnvVar}`);
    return false;
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error("Turnstile verification request failed", err);
    return false;
  }
}
