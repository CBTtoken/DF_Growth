import { sendEmail } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatZar } from "@/lib/bizup/money";

// The three emails KatisoBiz sends a member about their own documents.
//
// All three go to the member and never to the member's customer. That is
// the same rule the reminder feature follows and the reason is the same: a
// tool that messages your customers by itself is a trust problem, and a
// badly timed automatic chase damages a relationship the member owns and
// we do not.
//
// The product's real gap was silence. A member sends a quote and then has
// nothing until they remember to go and look. Each of these three exists
// because it prompts a specific action:
//
//   opened    the customer is reading it right now, so phone them
//   expiring  the quote is about to lapse, so follow it up
//   overdue   the money is late, so send a reminder
//
// Deliberately not built: "your quote was accepted". The member records
// acceptance themselves, since the customer has no login, so emailing them
// what they just clicked would be noise.
//
// Nothing here throws. These are called from a page render and from the
// daily cron, and a failed email must never break the page a customer is
// reading or stop the rest of the batch.

const ORIGIN = process.env.NEXT_PUBLIC_KATISOBIZ_URL ?? "https://katisobiz.co.za";

// The member-facing path. On katisobiz.co.za the proxy strips the /bizup
// prefix, so these are the short URLs a member actually sees.
function documentUrl(docType: string, id: string): string {
  return `${ORIGIN}/${docType === "quote" ? "quotes" : "invoices"}/${id}`;
}

function wrap(body: string, actionUrl: string, actionLabel: string): string {
  return `
    ${body}
    <p><a href="${actionUrl}">${actionLabel}</a></p>
    <p style="color:#6b7280;font-size:12px">
      You are getting this because email notifications are on for your KatisoBiz account.
      You can switch them off under Settings, then Business details.
    </p>
  `;
}

type NotifiableAccount = {
  id: string;
  business_name: string | null;
  email: string | null;
  notify_by_email: boolean | null;
  email_bounced_at: string | null;
  email_complained_at: string | null;
};

/**
 * Loads the account only if it actually wants email and can receive it.
 * Returns null otherwise, so every caller gets the check for free rather
 * than having to remember it.
 *
 * Three separate reasons to stay quiet, and they are not the same thing:
 *
 * - notify_by_email false is the member's own choice, made in settings or
 *   through the unsubscribe link, and it is reversible by them
 * - a hard bounce means the address does not work. Continuing to send is
 *   pointless and actively harmful, because both products share a sending
 *   domain and the reputation damage lands on Growth's password resets too
 * - a spam complaint means they marked us. That one is permanent
 */
async function notifiableAccount(accountId: string): Promise<NotifiableAccount | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bizup_accounts")
    .select("id, business_name, email, notify_by_email, email_bounced_at, email_complained_at")
    .eq("id", accountId)
    .maybeSingle();

  if (!data || !data.email || data.notify_by_email === false) return null;
  if (data.email_bounced_at || data.email_complained_at) return null;
  return data;
}

async function send(
  account: NotifiableAccount,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    const result = await sendEmail({
      to: account.email as string,
      subject,
      html,
      fromName: "KatisoBiz",
    });
    if (!result.ok) {
      console.error("KatisoBiz notification failed to send", subject, result.error);
    }
    return result.ok;
  } catch (err) {
    console.error("KatisoBiz notification threw", subject, err);
    return false;
  }
}

/**
 * A customer has opened a quote or invoice for the first time.
 *
 * Called from the public document page, which already writes first_viewed_at
 * exactly once under a null guard. This performs its own guarded write on
 * notified_opened_at rather than trusting that, so a concurrent second open
 * cannot produce two emails.
 */
export async function notifyDocumentOpened(documentId: string): Promise<void> {
  const admin = createAdminClient();

  // Claim the notification first, then send. Claiming after sending would
  // let two simultaneous opens both pass the check and both email.
  const { data: claimed } = await admin
    .from("bizup_documents")
    .update({ notified_opened_at: new Date().toISOString() })
    .eq("id", documentId)
    .is("notified_opened_at", null)
    .select("id, account_id, doc_type, number, total_incl_cents, customer_snapshot")
    .maybeSingle();

  if (!claimed) return;

  const account = await notifiableAccount(claimed.account_id);
  if (!account) return;

  const customer = (claimed.customer_snapshot as { name?: string } | null)?.name ?? "Your customer";
  const isQuote = claimed.doc_type === "quote";
  const label = isQuote ? "quote" : "invoice";

  await send(
    account,
    `${customer} opened your ${label} ${claimed.number}`,
    wrap(
      `<p>Good day ${account.business_name ?? "there"},</p>
       <p><strong>${customer}</strong> has just opened ${label} <strong>${claimed.number}</strong> for ${formatZar(claimed.total_incl_cents)}.</p>
       <p>${
         isQuote
           ? "This is a good moment to phone them, while the job is fresh in their mind."
           : "They have seen it, so payment should follow. If it does not, you can send a reminder from the invoice."
       }</p>`,
      documentUrl(claimed.doc_type, claimed.id),
      `Open the ${label}`
    )
  );
}

/**
 * A quote is about to pass its valid_until date. Sent once, from the daily
 * job, for quotes still sitting at "sent" with no outcome recorded.
 */
export async function notifyQuoteExpiring(doc: {
  id: string;
  account_id: string;
  number: string | null;
  total_incl_cents: number;
  valid_until: string | null;
  customer_snapshot: unknown;
}): Promise<boolean> {
  const account = await notifiableAccount(doc.account_id);
  if (!account) return false;

  const customer = (doc.customer_snapshot as { name?: string } | null)?.name ?? "your customer";

  return send(
    account,
    `Quote ${doc.number} runs out on ${doc.valid_until}`,
    wrap(
      `<p>Good day ${account.business_name ?? "there"},</p>
       <p>Quote <strong>${doc.number}</strong> for <strong>${customer}</strong>, ${formatZar(doc.total_incl_cents)}, is valid until <strong>${doc.valid_until}</strong> and you have not marked it accepted or declined.</p>
       <p>One phone call now is usually the difference between winning it and it going quiet.</p>`,
      documentUrl("quote", doc.id),
      "Open the quote"
    )
  );
}

/**
 * An invoice has passed its due date. Sent once only. Chasing beyond that
 * is the member's call, using the reminder that opens their own WhatsApp.
 */
export async function notifyInvoiceOverdue(doc: {
  id: string;
  account_id: string;
  number: string | null;
  total_incl_cents: number;
  due_date: string | null;
  customer_snapshot: unknown;
}): Promise<boolean> {
  const account = await notifiableAccount(doc.account_id);
  if (!account) return false;

  const customer = (doc.customer_snapshot as { name?: string } | null)?.name ?? "your customer";

  return send(
    account,
    `Invoice ${doc.number} is overdue`,
    wrap(
      `<p>Good day ${account.business_name ?? "there"},</p>
       <p>Invoice <strong>${doc.number}</strong> for <strong>${customer}</strong>, ${formatZar(doc.total_incl_cents)}, was due on <strong>${doc.due_date}</strong> and is not marked paid.</p>
       <p>You can send a reminder straight from the invoice. It opens WhatsApp on your phone with the message ready, and you press send yourself.</p>`,
      documentUrl("invoice", doc.id),
      "Open the invoice"
    )
  );
}
