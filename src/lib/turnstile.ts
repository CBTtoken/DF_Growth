// Rate & Review Sprint 1, Sec 3: server-side half of Cloudflare Turnstile —
// the client widget (TurnstileWidget.tsx) only produces a token, this is
// what actually proves it's real. Never trust the token's mere presence,
// always verify it against Cloudflare directly.
export async function verifyTurnstileToken(token: string | null, remoteIp?: string): Promise<boolean> {
  if (!token) return false;

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("Missing TURNSTILE_SECRET_KEY");
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
