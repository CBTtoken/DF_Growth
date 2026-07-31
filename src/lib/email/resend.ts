import { EMAIL_FOOTER_HTML, DOCUMENT_FOOTER_HTML, type EmailFooterKind } from "@/lib/email/footer";

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
  footer = "platform",
  kind = "transactional",
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
  /**
   * Which sign-off to append. Defaults to "platform", so nothing that exists
   * today changes and nothing added later can accidentally ship without one.
   *
   * "document" is for a quote, invoice or credit note a KatisoBiz member
   * sends to their own customer. Those must not be signed by us: see
   * lib/email/footer.ts for the live defect that prompted this.
   */
  footer?: EmailFooterKind;
  /**
   * Which domain this goes out on, and it is enforced here rather than left
   * to each call site to remember.
   *
   * "transactional" is invoices, password resets, leads and notifications. It
   * uses notify.digitalflyersa.co.za and its reputation must be protected at
   * all costs: if that domain gets throttled, a member's invoice stops
   * reaching their customer and nobody can reset a password.
   *
   * "marketing" is campaigns, and goes out on mail.digitalflyer.co.za, a
   * different root domain entirely. The worst a bad campaign can then do is
   * burn the marketing domain, which costs us a campaign rather than the
   * product.
   */
  kind?: "transactional" | "marketing";
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "Missing RESEND_API_KEY" };

  // Marketing has its own verified domain so a campaign can never damage the
  // deliverability of anything the product depends on. Falls back to the
  // transactional sender only if the marketing one is not configured, which
  // is safer than failing to send at all but should never happen in
  // production.
  const configuredFrom =
    (kind === "marketing" ? process.env.RESEND_MARKETING_FROM : undefined) ??
    process.env.RESEND_FROM_EMAIL ??
    "DigitalFlyer Growth <onboarding@resend.dev>";
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
  const htmlWithFooter = `${html}${footer === "document" ? DOCUMENT_FOOTER_HTML : EMAIL_FOOTER_HTML}`;

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
