import { EMAIL_FOOTER_HTML } from "@/lib/email/footer";

// Plain fetch against Resend's HTTP API, same minimal-dependency approach
// used for Meta's Conversions API (lib/meta/capi.ts) — no SDK needed for a
// single POST. RESEND_FROM_EMAIL is not yet a verified custom domain
// (notify.digitalflyer.co.za is pending DNS setup, see the Master Technical
// Build Scope Section 4), so this defaults to Resend's shared test sender,
// which only delivers to the Resend account's own verified email until the
// custom domain is verified. Switch RESEND_FROM_EMAIL once that's done —
// no code change needed, just the env var.
export async function sendEmail({
  to,
  subject,
  html,
  fromName,
  replyTo,
  cc,
}: {
  to: string;
  subject: string;
  html: string;
  // KatisoBiz Sec 9: a document emailed to a customer goes out under the
  // member's own business name, with replies going to the member rather
  // than to DigitalFlyer. The sending address itself stays our verified
  // domain, since we cannot send as an address we do not control.
  fromName?: string;
  replyTo?: string;
  /**
   * Copies an address the recipient can see, so a reply-all reaches a real
   * person at DigitalFlyer rather than only the sending domain.
   *
   * Added for the check-in emails at Dewald's ask. Deliberately visible
   * rather than bcc: the point is that the member can see somebody is on
   * the other end of it.
   */
  cc?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "Missing RESEND_API_KEY" };

  const configuredFrom =
    process.env.RESEND_FROM_EMAIL ?? "DigitalFlyer Growth <onboarding@resend.dev>";
  // Swaps only the display name, keeping whatever verified address is
  // configured. Quotes are stripped so a business name containing one
  // cannot break the header.
  const from = fromName
    ? `${fromName.replace(/["<>]/g, "")} <${
        configuredFrom.includes("<") ? configuredFrom.split("<")[1].replace(">", "") : configuredFrom
      }>`
    : configuredFrom;
  // Public Beta Polish Sprint Sec 12: appended here, not at each call site
  // — every email sent through this one function gets it automatically,
  // including anything added later.
  const htmlWithFooter = `${html}${EMAIL_FOOTER_HTML}`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html: htmlWithFooter,
      ...(replyTo ? { reply_to: replyTo } : {}),
      ...(cc ? { cc } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: `Resend ${res.status}: ${body}` };
  }

  return { ok: true };
}
