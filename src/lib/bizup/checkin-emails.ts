import { sendEmail } from "@/lib/email/resend";
import { formatZar } from "@/lib/bizup/money";
import { bizupUnsubscribeUrl } from "@/lib/bizup/unsubscribe";

// The three check-in emails, one per situation a member can be in a few
// days after signing up.
//
// Dewald's framing, and it is better than the version I proposed. I had one
// generic nudge; he split it by what the member has actually done, on the
// grounds that sending "have you tried it yet" to somebody with four
// unfinished quotes is insulting. He is right.
//
//   started   a draft exists and nothing was issued. The job is still warm.
//             Asks what got in the way rather than telling them what to do,
//             because the answer is worth more than the nudge.
//
// Standing rule on the copy, from Dewald, 1 August 2026: never position
// ourselves as new or the member as one of the first. Two lines in here did
// exactly that, "you are one of our first members" and "we are still small
// enough", and both are gone. A member is paying for a working product, not
// joining an experiment, and every line should read as we are here to help
// you get value out of this.
//   idle      nothing created at all. Phrased as an offer of help, not a
//             prompt to try harder.
//   feedback  they issued something, so it worked. Asks what would make it
//             better while the experience is still fresh.
//
// All three copy info@digitalflyer.co.za visibly, so a reply reaches a
// person rather than the sending domain, and so the member can see that
// somebody is on the other end. Deliberately cc rather than bcc.
//
// None of them go to a member who has switched email off. That is checked
// by the caller, and Dewald's position on it is that he will contact those
// people himself as the founder rather than have the system do it.

const SUPPORT = "info@digitalflyer.co.za";
const BRAND_BLUE = "#1081b8";
const INK = "#1c2b3a";

function shell(body: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;font-size:15px;line-height:1.6;color:${INK};">${body}</div>`;
}

function replyLine(): string {
  return `
    <p style="margin:22px 0 0;font-size:15px;line-height:1.6;color:#4a5b6b;">
      Just hit reply to this email and it comes straight to us, or write to
      <a href="mailto:${SUPPORT}" style="color:${BRAND_BLUE};font-weight:700;">${SUPPORT}</a>.
      A real person reads every one.
    </p>`;
}

type Account = { id: string; businessName: string; email: string };

/**
 * One click and they hear from us no more.
 *
 * Added once a real unsubscribe page existed for KatisoBiz. Before that
 * these emails offered only "reply and tell us", which is a valid opt-out
 * and is what the privacy policy promises, but it relies on somebody
 * reading the reply and changing a setting by hand. That does not survive
 * volume.
 */
function unsubscribeLine(accountId: string): string {
  return `
    <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#9ca3af;">
      Would rather not get these? <a href="${bizupUnsubscribeUrl(accountId)}" style="color:#9ca3af;">Unsubscribe</a>.
      It only stops emails to you. The quotes and invoices you send your own customers are not affected.
    </p>`;
}

async function send(account: Account, subject: string, body: string) {
  const result = await sendEmail({
    to: account.email,
    subject,
    html: shell(body + unsubscribeLine(account.id)),
    fromName: "KatisoBiz",
    replyTo: SUPPORT,
    // Visible on purpose: a reply-all reaches a person, and seeing the
    // address is half the reassurance.
    cc: SUPPORT,
  });
  if (!result.ok) console.error("KatisoBiz check-in email failed", subject, result.error);
  return result.ok;
}

/**
 * They built a quote and never sent it. About 24 hours in.
 *
 * Names the amount when there is one, because "your R55,020 quote" makes
 * somebody look and "your draft quote" does not.
 */
export async function sendStartedCheckin(
  account: Account,
  draft: { totalCents: number; customerName: string | null }
): Promise<boolean> {
  const worth =
    draft.totalCents > 0
      ? `a quote for <strong>${formatZar(draft.totalCents)}</strong>${
          draft.customerName ? ` for ${draft.customerName}` : ""
        }`
      : "a quote";

  return send(
    account,
    "How did you find it? Your quote is still waiting",
    `
      <p style="margin:0 0 14px;">Good day ${account.businessName},</p>

      <p style="margin:0 0 14px;">
        You started ${worth} on KatisoBiz and it is still sitting in your drafts, so we thought we
        would check in rather than leave you to it.
      </p>

      <p style="margin:0 0 14px;">
        If it is ready to go, open it, press <strong>Issue this quote</strong> to give it a number,
        then <strong>Send on WhatsApp</strong>. Your customer gets it from your own number.
      </p>

      <p style="margin:0 0 14px;">
        <strong>And if something got in the way, tell us and we will sort it out.</strong> Was
        something confusing, missing, or just more effort than it should have been? That is exactly
        what we are here for, and no answer is too small or too blunt.
      </p>
      ${replyLine()}
    `
  );
}

/** Registered and created nothing. About 48 hours in. */
export async function sendIdleCheckin(account: Account): Promise<boolean> {
  return send(
    account,
    "Anything we can help with?",
    `
      <p style="margin:0 0 14px;">Good day ${account.businessName},</p>

      <p style="margin:0 0 14px;">
        We noticed you have signed up but not made your first quote yet, and we wanted to ask
        whether there is anything we can help with rather than assume you are not interested.
      </p>

      <p style="margin:0 0 14px;">
        Sometimes it is something small: not sure where to start, unsure whether you need banking
        details first, or you simply have not had a quiet five minutes. Any of those we can sort
        out quickly.
      </p>

      <p style="margin:0 0 14px;">
        For what it is worth, the whole thing is one screen. Press <strong>Start a quote</strong>,
        enter what you are charging for, add the customer, and send it on WhatsApp. Under a minute
        once you have done it once.
      </p>
      ${replyLine()}
    `
  );
}

/** They issued something and it worked. About 72 hours in. */
export async function sendFeedbackCheckin(account: Account): Promise<boolean> {
  return send(
    account,
    "You are up and running, what would make it better?",
    `
      <p style="margin:0 0 14px;">Good day ${account.businessName},</p>

      <p style="margin:0 0 14px;">
        You have sent your first document on KatisoBiz. That is the hard part done, and everything
        after this one gets quicker.
      </p>

      <p style="margin:0 0 14px;">
        <strong>We want you getting real value out of this, so tell us where it is not pulling its
        weight yet.</strong> Now that you have used it on a real job, what was awkward? What took
        longer than it should have? What would you add tomorrow if you could?
      </p>

      <p style="margin:0 0 14px;">
        Ask and we will look at it properly. Several things in KatisoBiz today exist because a
        member asked for them.
      </p>
      ${replyLine()}
    `
  );
}
