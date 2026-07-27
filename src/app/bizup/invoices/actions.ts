"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  currentAccount,
  allocateNumber,
  generatePublicToken,
  buildIssuerSnapshot,
  buildCustomerSnapshot,
  buildBankSnapshot,
  loadSettings,
  type CustomerRow,
} from "@/lib/bizup/documents";
import { getCapState } from "@/lib/bizup/cap";
import { missingFullTaxInvoiceFields, isVatVendor } from "@/lib/bizup/vat";
import { parseAmountToCents } from "@/lib/bizup/money";

// BizUp/docs/bizup-phase1-spec.md Sec 15.5 and 15.8.

export type InvoiceState = { error?: string; ok?: string } | null;

/** Sec 3.3: a tax invoice is due within 21 days. 30 day terms are the SA norm. */
const DEFAULT_PAYMENT_TERMS_DAYS = 30;

/**
 * Issues an invoice: allocates its number, freezes the snapshots, makes it
 * shareable.
 *
 * Sec 3.2 is enforced here and only here: over R5,000 a VAT vendor cannot
 * issue without the customer's legal name and physical address. The spec is
 * explicit that this blocks issuing and never blocks editing, so a member
 * is never stuck mid-job.
 */
export async function issueInvoice(_prev: InvoiceState, formData: FormData): Promise<InvoiceState> {
  const documentId = String(formData.get("documentId") ?? "");
  const account = await currentAccount();
  if (!account) return { error: "Please log in again." };

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("bizup_documents")
    .select("id, number, status, customer_id, total_incl_cents")
    .eq("id", documentId)
    .eq("account_id", account.id)
    .eq("doc_type", "invoice")
    .maybeSingle();

  if (!doc) return { error: "That invoice could not be found." };
  if (doc.number) return { ok: "This invoice has already been issued." };

  const { data: acct } = await admin
    .from("bizup_accounts")
    .select("plan, topup_balance")
    .eq("id", account.id)
    .maybeSingle();
  if (!acct) return { error: "We couldn't check your account. Please try again." };

  const cap = await getCapState(account.id, acct.plan, acct.topup_balance);
  if (!cap.canIssue) {
    return {
      error: `You have used all ${cap.allowance} documents this month. This invoice is saved. Add more to send it.`,
    };
  }

  const { data: customer } = doc.customer_id
    ? await admin
        .from("bizup_customers")
        .select("id, name, is_business, vat_number, email, phone, whatsapp, address_line1, address_line2, city, province, postal_code")
        .eq("id", doc.customer_id)
        .eq("account_id", account.id)
        .maybeSingle()
    : { data: null };

  const settings = await loadSettings();
  const vendor = isVatVendor(account.vat_number);

  // Sec 3.2's full tax invoice requirement.
  const missing = missingFullTaxInvoiceFields(
    {
      name: customer?.name,
      addressLine1: customer?.address_line1,
      city: customer?.city,
    },
    doc.total_incl_cents,
    settings,
    vendor,
  );

  if (missing.length > 0) {
    return {
      error: `This invoice is over R5,000, so SARS needs more about your customer before you can send it. Still needed: ${missing.join(", ")}.`,
    };
  }

  if (!customer) {
    return { error: "Choose a customer before issuing this invoice." };
  }

  const { data: bank } = await admin
    .from("bizup_bank_details")
    .select("bank_name, account_holder, account_number_last4, branch_code, account_type")
    .eq("account_id", account.id)
    .maybeSingle();

  const now = new Date();
  const due = new Date(now);
  due.setDate(due.getDate() + DEFAULT_PAYMENT_TERMS_DAYS);

  const number = await allocateNumber(account.id, "INV", now.getFullYear());

  const { error } = await admin
    .from("bizup_documents")
    .update({
      number,
      status: "issued",
      issued_at: now.toISOString(),
      issue_date: now.toISOString().slice(0, 10),
      due_date: due.toISOString().slice(0, 10),
      public_token: generatePublicToken(),
      issuer_snapshot: buildIssuerSnapshot(account),
      customer_snapshot: buildCustomerSnapshot(customer as CustomerRow),
      bank_snapshot: buildBankSnapshot(bank ?? null, account.bank_notice_style, account.phone),
    })
    .eq("id", documentId)
    // Guards a double click: a racing second request finds no numberless
    // row, so an invoice can never take two numbers.
    .is("number", null);

  if (error) {
    console.error("Failed to issue BizUp invoice", error);
    return { error: "We couldn't issue that. Please try again." };
  }

  if (cap.usingTopup) {
    await admin
      .from("bizup_accounts")
      .update({ topup_balance: Math.max(0, acct.topup_balance - 1) })
      .eq("id", account.id);
  }

  await admin.from("bizup_audit_log").insert({
    account_id: account.id,
    document_id: documentId,
    action: "invoice_issued",
    to_status: "issued",
    reason: number,
  });

  revalidatePath(`/bizup/invoices/${documentId}`);
  return { ok: `Issued as ${number}.` };
}

/**
 * Sec 15.8, recording a payment.
 *
 * The invoice status follows the arithmetic rather than being set by hand:
 * anything short of the full amount is partially_paid, reaching it is paid.
 * A member should never have to tell the system something it can work out.
 */
export async function recordPayment(_prev: InvoiceState, formData: FormData): Promise<InvoiceState> {
  const documentId = String(formData.get("documentId") ?? "");
  const account = await currentAccount();
  if (!account) return { error: "Please log in again." };

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("bizup_documents")
    .select("id, number, status, total_incl_cents")
    .eq("id", documentId)
    .eq("account_id", account.id)
    .eq("doc_type", "invoice")
    .maybeSingle();

  if (!doc) return { error: "That invoice could not be found." };
  if (!doc.number) return { error: "Issue this invoice before recording a payment." };

  const amount = parseAmountToCents(String(formData.get("amount") ?? ""));
  if (amount === null || amount <= 0) return { error: "Enter an amount like 450 or 450.00" };

  const paidAt = String(formData.get("paidAt") ?? "") || new Date().toISOString().slice(0, 10);
  const method = String(formData.get("method") ?? "eft");

  const { error } = await admin.from("bizup_payments").insert({
    document_id: documentId,
    amount_cents: amount,
    paid_at: paidAt,
    method,
    reference: String(formData.get("reference") ?? "").trim() || null,
  });

  if (error) {
    console.error("Failed to record BizUp payment", error);
    return { error: "We couldn't record that. Please try again." };
  }

  // Recomputed from every payment on the invoice rather than added to a
  // running field, so a corrected or deleted payment can never leave the
  // status disagreeing with the payments listed beneath it.
  const { data: payments } = await admin
    .from("bizup_payments")
    .select("amount_cents")
    .eq("document_id", documentId);

  const paid = (payments ?? []).reduce((s, p) => s + p.amount_cents, 0);
  const status = paid >= doc.total_incl_cents ? "paid" : "partially_paid";

  await admin.from("bizup_documents").update({ status }).eq("id", documentId);

  await admin.from("bizup_audit_log").insert({
    account_id: account.id,
    document_id: documentId,
    action: "payment_recorded",
    from_status: doc.status,
    to_status: status,
    reason: `${amount} cents by ${method}`,
  });

  revalidatePath(`/bizup/invoices/${documentId}`);
  return {
    ok: status === "paid" ? "Paid in full." : "Payment recorded.",
  };
}

/**
 * One-tap "mark as paid" for the dashboard.
 *
 * Dewald wants accept, decline and paid available straight from the home
 * screen without opening the document. Records a payment for whatever is
 * still outstanding, which is what "they paid me" almost always means. A
 * part payment still goes through the full form on the invoice itself,
 * where the amount and reference belong.
 */
export async function markInvoicePaid(formData: FormData): Promise<void> {
  const documentId = String(formData.get("documentId") ?? "");
  const account = await currentAccount();
  if (!account) return;

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("bizup_documents")
    .select("id, number, status, total_incl_cents")
    .eq("id", documentId)
    .eq("account_id", account.id)
    .eq("doc_type", "invoice")
    .maybeSingle();

  if (!doc?.number) return;

  const { data: payments } = await admin
    .from("bizup_payments")
    .select("amount_cents")
    .eq("document_id", documentId);

  const paid = (payments ?? []).reduce((s, p) => s + p.amount_cents, 0);
  const outstanding = doc.total_incl_cents - paid;
  if (outstanding <= 0) return;

  await admin.from("bizup_payments").insert({
    document_id: documentId,
    amount_cents: outstanding,
    paid_at: new Date().toISOString().slice(0, 10),
    method: "eft",
  });

  await admin.from("bizup_documents").update({ status: "paid" }).eq("id", documentId);

  await admin.from("bizup_audit_log").insert({
    account_id: account.id,
    document_id: documentId,
    action: "invoice_marked_paid",
    from_status: doc.status,
    to_status: "paid",
    reason: "Marked paid in full from the dashboard",
  });

  revalidatePath("/bizup");
  revalidatePath("/bizup/invoices");
}

/**
 * A blank invoice, with no quote behind it.
 *
 * Dewald: "sometimes you can go straight to an invoice and don't need to
 * produce a quote first." Until now the only way to get an invoice was to
 * convert a quote, which is wrong for a call-out that is done and paid on
 * the same visit.
 */
export async function createInvoice(): Promise<void> {
  const account = await currentAccount();
  if (!account) redirect("/bizup/login");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bizup_documents")
    .insert({
      account_id: account.id,
      doc_type: "invoice",
      series: "INV",
      status: "draft",
      template_id: account.template_id,
      vat_rate: isVatVendor(account.vat_number) ? 0.15 : 0,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Failed to create BizUp invoice", error);
    redirect("/bizup/invoices");
  }

  redirect(`/bizup/invoices/${data.id}`);
}
