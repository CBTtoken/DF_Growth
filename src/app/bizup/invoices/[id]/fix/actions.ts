"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  currentAccount,
  allocateNumber,
  generatePublicToken,
  loadSettings,
} from "@/lib/bizup/documents";

// BizUp/docs/bizup-phase1-spec.md Sec 7, "Fix this invoice".
//
// Sec 7's absolute rules, all enforced here rather than by hiding buttons:
//   - An issued document is never deleted, never renumbered, and its
//     amounts are never overwritten.
//   - Every path is reversible up until the final button. Nothing is
//     written until then.
//   - After any correction the member is shown what the customer will now
//     receive and must press Send themselves. The system never re-sends.
//
// Deliberate Phase 1 simplifications, also from Sec 7: no debit notes, and
// no partial credit notes. An increase in value is a full credit plus a
// new invoice. Both are legally defensible and far simpler for someone who
// is not an accountant.

export type FixState = { error?: string } | null;

async function ownedInvoice(documentId: string) {
  const account = await currentAccount();
  if (!account) return null;

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("bizup_documents")
    .select("*")
    .eq("id", documentId)
    .eq("account_id", account.id)
    .eq("doc_type", "invoice")
    .maybeSingle();

  // Only an issued invoice can be fixed. A draft is simply edited.
  if (!doc?.number) return null;
  return { account, doc, admin };
}

/**
 * Sec 7: credit notes take their own series but the same no-gap rule, and
 * they never count against the document cap, because "a member must never
 * be charged for fixing a mistake".
 */
async function createFullCreditNote(
  account: Awaited<ReturnType<typeof currentAccount>>,
  invoice: Record<string, unknown>,
  reason: string,
) {
  if (!account) throw new Error("No account");
  const admin = createAdminClient();
  const now = new Date();
  const number = await allocateNumber(account.id, "CN", now.getFullYear());

  const { data: creditNote, error } = await admin
    .from("bizup_documents")
    .insert({
      account_id: account.id,
      doc_type: "credit_note",
      series: "CN",
      status: "issued",
      customer_id: invoice.customer_id,
      // Sec 6: a credit note is always linked to its parent invoice.
      parent_document_id: invoice.id,
      number,
      issued_at: now.toISOString(),
      issue_date: now.toISOString().slice(0, 10),
      public_token: generatePublicToken(),
      // The same snapshots as the invoice it reverses, so the two documents
      // describe the same parties and the same banking details.
      issuer_snapshot: invoice.issuer_snapshot,
      customer_snapshot: invoice.customer_snapshot,
      bank_snapshot: invoice.bank_snapshot,
      template_id: invoice.template_id,
      // A full credit for the full amount. Sec 7 rules out partial credit
      // notes in Phase 1, so these always mirror the invoice exactly.
      vat_rate: invoice.vat_rate,
      subtotal_excl_cents: invoice.subtotal_excl_cents,
      vat_amount_cents: invoice.vat_amount_cents,
      total_incl_cents: invoice.total_incl_cents,
      notes: reason,
    })
    .select("id, number")
    .single();

  if (error || !creditNote) throw new Error(`Could not create credit note: ${error?.message}`);

  const { data: lines } = await admin
    .from("bizup_document_lines")
    .select("*")
    .eq("document_id", invoice.id as string)
    .order("line_no");

  if (lines?.length) {
    await admin.from("bizup_document_lines").insert(
      lines.map((l) => ({
        document_id: creditNote.id,
        line_no: l.line_no,
        description: l.description,
        quantity: l.quantity,
        unit: l.unit,
        unit_price_excl_cents: l.unit_price_excl_cents,
        line_total_excl_cents: l.line_total_excl_cents,
        tax_code: l.tax_code,
      })),
    );
  }

  return creditNote;
}

/**
 * Path A, Sec 7: "Correct the details."
 *
 * Section 20(1B) correction of particulars. Same invoice number, same
 * issue date, same amounts. Only who the invoice is addressed to and how
 * the work is described may change.
 *
 * The corrected version is a new row carrying the same number, linked by
 * correction_of_id. Both keep their own frozen snapshots, so either
 * version re-renders exactly as it was and neither can be edited
 * afterwards. The original is marked corrected, never deleted.
 */
export async function correctParticulars(_prev: FixState, formData: FormData): Promise<FixState> {
  const documentId = String(formData.get("documentId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "Please say what went wrong. This is kept with the invoice." };

  const owned = await ownedInvoice(documentId);
  if (!owned) return { error: "That invoice could not be found." };
  const { account, doc, admin } = owned;

  const snapshot = (doc.customer_snapshot ?? {}) as Record<string, unknown>;
  const correctedCustomer = {
    ...snapshot,
    name: String(formData.get("customerName") ?? snapshot.name ?? "").trim(),
    address: String(formData.get("customerAddress") ?? snapshot.address ?? "").trim(),
    vat_number: String(formData.get("customerVatNumber") ?? "").trim() || null,
  };

  const { data: corrected, error } = await admin
    .from("bizup_documents")
    .insert({
      account_id: account.id,
      doc_type: "invoice",
      series: "INV",
      status: "issued",
      customer_id: doc.customer_id,
      // Same number and same issue date. This is the whole point of a
      // 20(1B) correction: it is the same invoice, restated.
      number: doc.number,
      issue_date: doc.issue_date,
      due_date: doc.due_date,
      issued_at: new Date().toISOString(),
      correction_of_id: documentId,
      public_token: generatePublicToken(),
      issuer_snapshot: doc.issuer_snapshot,
      customer_snapshot: correctedCustomer,
      bank_snapshot: doc.bank_snapshot,
      template_id: doc.template_id,
      // Amounts copied verbatim and never recalculated. Sec 7: quantity,
      // price and total are not editable on this path.
      vat_rate: doc.vat_rate,
      subtotal_excl_cents: doc.subtotal_excl_cents,
      vat_amount_cents: doc.vat_amount_cents,
      total_incl_cents: doc.total_incl_cents,
      notes: doc.notes,
      terms: doc.terms,
    })
    .select("id")
    .single();

  if (error || !corrected) {
    console.error("Failed to correct BizUp invoice", error);
    return { error: "We couldn't save that. Please try again." };
  }

  const { data: lines } = await admin
    .from("bizup_document_lines")
    .select("*")
    .eq("document_id", documentId)
    .order("line_no");

  if (lines?.length) {
    await admin.from("bizup_document_lines").insert(
      lines.map((l) => ({
        document_id: corrected.id,
        line_no: l.line_no,
        catalogue_item_id: l.catalogue_item_id,
        // Only the wording may change. Quantity and price are carried over
        // untouched, so the totals cannot drift from the original.
        description: String(formData.get(`line_${l.id}`) ?? l.description).trim() || l.description,
        quantity: l.quantity,
        unit: l.unit,
        unit_price_excl_cents: l.unit_price_excl_cents,
        line_total_excl_cents: l.line_total_excl_cents,
        tax_code: l.tax_code,
      })),
    );
  }

  await admin.from("bizup_documents").update({ status: "corrected" }).eq("id", documentId);

  await admin.from("bizup_audit_log").insert({
    account_id: account.id,
    document_id: corrected.id,
    action: "invoice_particulars_corrected",
    from_status: doc.status,
    to_status: "issued",
    reason: `${doc.number}: ${reason}`,
  });

  revalidatePath("/bizup/invoices");
  redirect(`/bizup/invoices/${corrected.id}`);
}

/** Path B, Sec 7: "Cancel this invoice." Full credit note, invoice cancelled. */
export async function cancelInvoice(_prev: FixState, formData: FormData): Promise<FixState> {
  const documentId = String(formData.get("documentId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "Please say why it is being cancelled. This is kept with the record." };

  const owned = await ownedInvoice(documentId);
  if (!owned) return { error: "That invoice could not be found." };
  const { account, doc, admin } = owned;

  let creditNote;
  try {
    creditNote = await createFullCreditNote(account, doc, `Cancels ${doc.number}. ${reason}`);
  } catch (e) {
    console.error("Failed to cancel BizUp invoice", e);
    return { error: "We couldn't cancel that. Please try again." };
  }

  await admin.from("bizup_documents").update({ status: "cancelled" }).eq("id", documentId);

  await admin.from("bizup_audit_log").insert({
    account_id: account.id,
    document_id: documentId,
    action: "invoice_cancelled",
    from_status: doc.status,
    to_status: "cancelled",
    reason: `${creditNote.number}: ${reason}`,
  });

  revalidatePath("/bizup/invoices");
  redirect(`/bizup/invoices/${documentId}/fix/done?cn=${creditNote.number}`);
}

/**
 * Path C, Sec 7: "Replace with a corrected invoice."
 *
 * Full credit note for the original amount, then a fresh draft invoice
 * pre-filled with the same lines. The original becomes credited and points
 * forward to its replacement.
 */
export async function replaceInvoice(_prev: FixState, formData: FormData): Promise<FixState> {
  const documentId = String(formData.get("documentId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "Please say what needs to change. This is kept with the record." };

  const owned = await ownedInvoice(documentId);
  if (!owned) return { error: "That invoice could not be found." };
  const { account, doc, admin } = owned;

  let creditNote;
  try {
    creditNote = await createFullCreditNote(account, doc, `Replaces ${doc.number}. ${reason}`);
  } catch (e) {
    console.error("Failed to replace BizUp invoice", e);
    return { error: "We couldn't do that. Please try again." };
  }

  // The replacement opens as a draft with no number, so the member can fix
  // what was wrong before it becomes a financial record.
  const { data: replacement, error } = await admin
    .from("bizup_documents")
    .insert({
      account_id: account.id,
      doc_type: "invoice",
      series: "INV",
      status: "draft",
      customer_id: doc.customer_id,
      template_id: doc.template_id,
      notes: doc.notes,
      terms: doc.terms,
      vat_rate: doc.vat_rate,
      subtotal_excl_cents: doc.subtotal_excl_cents,
      vat_amount_cents: doc.vat_amount_cents,
      total_incl_cents: doc.total_incl_cents,
    })
    .select("id")
    .single();

  if (error || !replacement) {
    console.error("Failed to create replacement invoice", error);
    return { error: "The old invoice was cancelled but we couldn't open the new one. Please try again." };
  }

  const { data: lines } = await admin
    .from("bizup_document_lines")
    .select("*")
    .eq("document_id", documentId)
    .order("line_no");

  if (lines?.length) {
    await admin.from("bizup_document_lines").insert(
      lines.map((l) => ({
        document_id: replacement.id,
        line_no: l.line_no,
        catalogue_item_id: l.catalogue_item_id,
        description: l.description,
        quantity: l.quantity,
        unit: l.unit,
        unit_price_excl_cents: l.unit_price_excl_cents,
        line_total_excl_cents: l.line_total_excl_cents,
        tax_code: l.tax_code,
      })),
    );
  }

  await admin
    .from("bizup_documents")
    .update({ status: "credited", superseded_by_id: replacement.id })
    .eq("id", documentId);

  await admin.from("bizup_audit_log").insert({
    account_id: account.id,
    document_id: documentId,
    action: "invoice_replaced",
    from_status: doc.status,
    to_status: "credited",
    reason: `${creditNote.number} credits ${doc.number}. ${reason}`,
  });

  revalidatePath("/bizup/invoices");
  redirect(`/bizup/invoices/${documentId}/fix/done?cn=${creditNote.number}&new=${replacement.id}`);
}

/** Sec 3.3 and Sec 7: the soft 21-day warning on a late correction. */
export async function correctionWindowWarning(issueDate: string | null): Promise<string | null> {
  if (!issueDate) return null;
  const settings = await loadSettings();
  const days = Math.floor((Date.now() - new Date(issueDate).getTime()) / (24 * 60 * 60 * 1000));
  return days > settings.correctionWindowDays
    ? `SARS asks for corrections to be made within ${settings.correctionWindowDays} days. You can still correct this, but keep a note of why.`
    : null;
}
