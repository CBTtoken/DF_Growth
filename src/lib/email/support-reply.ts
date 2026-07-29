import { sendEmail } from "@/lib/email/resend";

// The reply an admin types in the Support inbox, sent to the person who
// filled in "Get in Touch".
//
// Everything here is typed by a human into a form and then dropped into an
// HTML email, so both the reply and the quoted original are escaped rather
// than trusted. An apostrophe in a business name should not be able to
// break the markup, and a message pasted in from somewhere else should not
// be able to inject anything.
//
// reply_to is info@digitalflyer.co.za, not the sending address: mail goes
// out from the notify subdomain, which is a sending domain nobody reads.
// The reply to a reply has to land in the mailbox a person actually opens.
const SUPPORT_REPLY_TO = "info@digitalflyer.co.za";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Blank lines become paragraph breaks, single newlines become line breaks,
// so what the admin sees in the textarea is what the recipient reads.
function toParagraphs(body: string): string {
  return escapeHtml(body.trim())
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export async function sendSupportReplyEmail({
  name,
  email,
  originalMessage,
  body,
}: {
  name: string;
  email: string;
  originalMessage: string | null;
  body: string;
}): Promise<{ ok: boolean; error?: string }> {
  const quoted = originalMessage?.trim()
    ? `
      <hr style="margin-top:24px;margin-bottom:16px;border:none;border-top:1px solid #e5e7eb;" />
      <p style="font-size:13px;color:#6b7280;margin:0 0 8px;">Your original message:</p>
      <blockquote style="margin:0;padding-left:12px;border-left:3px solid #e5e7eb;font-size:13px;color:#6b7280;white-space:pre-wrap;">${escapeHtml(
        originalMessage.trim()
      )}</blockquote>
    `
    : "";

  return sendEmail({
    to: email,
    subject: "Re: your message to DigitalFlyer SA",
    replyTo: SUPPORT_REPLY_TO,
    html: `
      <p>Good day ${escapeHtml(name)},</p>
      <p>Thank you for getting in touch with DigitalFlyer SA.</p>
      ${toParagraphs(body)}
      ${quoted}
    `,
  });
}
