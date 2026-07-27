"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  currentAccount,
  allocateNumber,
  generatePublicToken,
  buildIssuerSnapshot,
  buildCustomerSnapshot,
  buildBankSnapshot,
  type CustomerRow,
} from "@/lib/bizup/documents";
import { getCapState } from "@/lib/bizup/cap";
import { isKatisoBizHost } from "@/lib/bizup/product";
import { sendEmail } from "@/lib/email/resend";
import { formatZar } from "@/lib/bizup/money";
import { documentTitle, isVatVendor } from "@/lib/bizup/vat";

// BizUp/docs/bizup-phase1-spec.md Sec 15.7, sending.

export type SendState = { error?: string; ok?: string } | null;

/**
 * Sec 9: the public link a customer opens. Built from the request host so
 * a link created on katisobiz.co.za points there, and a link
 * created in development points at localhost.
 *
 * The host header is used only to build a link the member is about to look
 * at and approve, never to derive anything security sensitive, so the
 * host-header-injection concern that applies to auth redirects does not
 * apply here.
 */
async function publicUrlFor(token: string): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "katisobiz.co.za";
  const protocol = host.startsWith("localhost") ? "http" : "https";

  // The page lives at /bizup/d/[token]. On KatisoBiz's own hostname the proxy
  // strips that prefix, so the customer gets the short /d/... link. On any
  // other host the full path is needed, which is what makes this work in
  // development and on the Growth domain.
  const path = isKatisoBizHost(host)
    ? `/d/${token}`
    : `/bizup/d/${token}`;

  return `${protocol}://${host}${path}`;
}

/**
 * Issues a quote: allocates its number, freezes the snapshots, and makes
 * it shareable.
 *
 * Sec 15: the cap is checked here and nowhere else. "The block happens at
 * Send, never at Create," so a member at zero remaining can still build the
 * whole quote in a customer's kitchen and simply cannot send it yet.
 */
export async function issueQuote(_prevState: SendState, formData: FormData): Promise<SendState> {
  const documentId = String(formData.get("documentId") ?? "");
  const account = await currentAccount();
  if (!account) return { error: "Please log in again." };

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("bizup_documents")
    .select("id, number, status, doc_type, customer_id, total_incl_cents")
    .eq("id", documentId)
    .eq("account_id", account.id)
    .maybeSingle();

  if (!doc) return { error: "That quote could not be found." };
  if (doc.number) return { ok: "This quote has already been issued." };

  const { data: acct } = await admin
    .from("bizup_accounts")
    .select("plan, topup_balance")
    .eq("id", account.id)
    .maybeSingle();

  // Refusing to issue is the safe direction if the account row cannot be
  // read: issuing without knowing the plan would hand out a number that
  // can never be taken back.
  if (!acct) return { error: "We couldn't check your account. Please try again." };

  const cap = await getCapState(account.id, acct.plan, acct.topup_balance);
  if (!cap.canIssue) {
    return {
      error: `You have used all ${cap.allowance} documents this month. Your drafts are safe. Add more to send this one.`,
    };
  }

  // Dewald hit this from the other end: a quote issued with no customer
  // converts into an invoice with no customer, and then cannot be issued.
  // Requiring it here stops the whole chain, and a quote you are about to
  // send should know who it is going to anyway.
  if (!doc.customer_id) {
    return { error: "Choose who this quote is for before you send it." };
  }

  const { data: customer } = doc.customer_id
    ? await admin
        .from("bizup_customers")
        .select("id, name, is_business, vat_number, email, phone, whatsapp, address_line1, address_line2, city, province, postal_code")
        .eq("id", doc.customer_id)
        .eq("account_id", account.id)
        .maybeSingle()
    : { data: null };

  const { data: bank } = await admin
    .from("bizup_bank_details")
    .select("bank_name, account_holder, account_number_last4, branch_code, account_type")
    .eq("account_id", account.id)
    .maybeSingle();

  const year = new Date().getFullYear();
  const number = await allocateNumber(account.id, "QUO", year);
  const token = generatePublicToken();

  const { error } = await admin
    .from("bizup_documents")
    .update({
      number,
      status: "sent",
      issued_at: new Date().toISOString(),
      issue_date: new Date().toISOString().slice(0, 10),
      public_token: token,
      // Sec 4 rule 1: frozen here and never re-read.
      issuer_snapshot: buildIssuerSnapshot(account),
      customer_snapshot: buildCustomerSnapshot((customer as CustomerRow) ?? null),
      bank_snapshot: buildBankSnapshot(bank ?? null, account.bank_notice_style, account.phone),
    })
    .eq("id", documentId)
    // Guards against two clicks racing: the second finds no numberless row
    // and changes nothing, so a quote can never take two numbers.
    .is("number", null);

  if (error) {
    console.error("Failed to issue KatisoBiz quote", error);
    return { error: "We couldn't issue that. Please try again." };
  }

  // Sec 15: purchased credit is only drawn once the monthly allowance is
  // gone, never while free allowance remains.
  if (cap.usingTopup) {
    await admin
      .from("bizup_accounts")
      .update({ topup_balance: Math.max(0, acct.topup_balance - 1) })
      .eq("id", account.id);
  }

  await admin.from("bizup_audit_log").insert({
    account_id: account.id,
    document_id: documentId,
    action: "quote_issued",
    to_status: "sent",
    reason: number,
  });

  revalidatePath(`/bizup/quotes/${documentId}`);
  return { ok: `Issued as ${number}. Ready to send.` };
}

/**
 * Sec 9: email through Resend, from the DigitalFlyer sending domain but
 * under the member's business name, with replies going to the member.
 */
export async function emailQuote(_prevState: SendState, formData: FormData): Promise<SendState> {
  const documentId = String(formData.get("documentId") ?? "");
  const account = await currentAccount();
  if (!account) return { error: "Please log in again." };

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("bizup_documents")
    .select("id, number, public_token, total_incl_cents, valid_until, customer_snapshot, bizup_customers(email, name)")
    .eq("id", documentId)
    .eq("account_id", account.id)
    .maybeSingle();

  if (!doc) return { error: "That quote could not be found." };
  if (!doc.number || !doc.public_token) return { error: "Issue the quote before sending it." };

  const snapshot = doc.customer_snapshot as { name?: string } | null;
  const customer = doc.bizup_customers as unknown as { email: string | null; name: string } | null;
  const to = String(formData.get("email") ?? "").trim() || customer?.email || "";

  if (!to) return { error: "No email address for this customer. Add one, or send on WhatsApp." };

  const url = await publicUrlFor(doc.public_token);
  const vendor = isVatVendor(account.vat_number);
  const name = snapshot?.name ?? customer?.name ?? "there";

  const sent = await sendEmail({
    to,
    fromName: account.business_name,
    replyTo: account.email,
    subject: `${documentTitle("quote", vendor)} ${doc.number} from ${account.business_name}`,
    html: `
      <p>Good day ${name},</p>
      <p>Here is your quote from ${account.business_name}, for ${formatZar(doc.total_incl_cents)}${vendor ? " including VAT" : ""}.</p>
      <p><a href="${url}">View and download the quote</a></p>
      ${doc.valid_until ? `<p>This quote is valid until ${doc.valid_until}.</p>` : ""}
      <p>Reply to this email if you have any questions.</p>
      <p>${account.business_name}</p>
    `,
  });

  if (!sent.ok) {
    console.error("Failed to email KatisoBiz quote", sent.error);
    return { error: "We couldn't send that email. Please try again, or send on WhatsApp." };
  }

  await admin
    .from("bizup_documents")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", documentId);

  await admin.from("bizup_audit_log").insert({
    account_id: account.id,
    document_id: documentId,
    action: "quote_emailed",
    reason: to,
  });

  revalidatePath(`/bizup/quotes/${documentId}`);
  return { ok: `Sent to ${to}.` };
}

/**
 * Sec 9: WhatsApp is a wa.me deep link, not the Business API. The message
 * opens in the member's own WhatsApp, from their own number, so the
 * customer receives it from a number they recognise. This costs nothing
 * and needs no Meta approval.
 *
 * Returns the link rather than doing anything, because the send happens on
 * the member's phone.
 */
export async function whatsappLinkFor(
  token: string,
  businessName: string,
  customerName: string | null,
  totalCents: number,
  customerWhatsapp: string | null,
): Promise<string> {
  const url = await publicUrlFor(token);
  const message = [
    `Good day${customerName ? " " + customerName : ""},`,
    ``,
    `Here is your quote from ${businessName} for ${formatZar(totalCents)}.`,
    url,
  ].join("\n");

  // A South African number typed as 082... becomes 2782... for wa.me.
  // Left off entirely when unknown, which opens WhatsApp's own contact
  // picker rather than guessing at a recipient.
  const digits = (customerWhatsapp ?? "").replace(/[^0-9]/g, "");
  const international = digits.startsWith("0") ? `27${digits.slice(1)}` : digits;

  return international
    ? `https://wa.me/${international}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
}
