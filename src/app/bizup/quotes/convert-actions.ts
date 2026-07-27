"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentAccount, recalcDocumentTotals } from "@/lib/bizup/documents";
import { isVatVendor } from "@/lib/bizup/vat";

// BizUp/docs/bizup-phase1-spec.md Sec 15.6, quote to invoice conversion.
// Lifecycle in Sec 6: a quote runs draft, sent, accepted or declined or
// expired, then converted.

async function ownedQuote(documentId: string) {
  const account = await currentAccount();
  if (!account) return null;

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("bizup_documents")
    .select("*")
    .eq("id", documentId)
    .eq("account_id", account.id)
    .eq("doc_type", "quote")
    .maybeSingle();

  return doc ? { account, doc, admin } : null;
}

/** Sec 6. Recorded by the member, since the customer has no login. */
export async function setQuoteOutcome(formData: FormData): Promise<void> {
  const documentId = String(formData.get("documentId") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  if (!["accepted", "declined"].includes(outcome)) return;

  const owned = await ownedQuote(documentId);
  if (!owned) return;
  const { account, doc, admin } = owned;

  // Only a quote that has actually been issued can have an outcome. A
  // draft has not been seen by anyone yet.
  if (!doc.number) return;

  await admin.from("bizup_documents").update({ status: outcome }).eq("id", documentId);

  await admin.from("bizup_audit_log").insert({
    account_id: account.id,
    document_id: documentId,
    action: `quote_${outcome}`,
    from_status: doc.status,
    to_status: outcome,
  });

  revalidatePath(`/bizup/quotes/${documentId}`);
}

/**
 * Sec 15.6: turns an accepted quote into an invoice.
 *
 * The invoice is created as a draft, not issued. The member may need to
 * adjust quantities for what was actually done on the day, and Sec 5 is
 * firm that a number is only assigned at issue. Nothing about the quote
 * changes except its status.
 */
export async function convertToInvoice(formData: FormData): Promise<void> {
  const documentId = String(formData.get("documentId") ?? "");
  const owned = await ownedQuote(documentId);
  if (!owned) return;
  const { account, doc, admin } = owned;

  if (!doc.number) return;

  // Idempotent: a second click finds the invoice already created and opens
  // it, rather than producing a duplicate.
  const { data: existing } = await admin
    .from("bizup_documents")
    .select("id")
    .eq("parent_document_id", documentId)
    .eq("doc_type", "invoice")
    .maybeSingle();
  if (existing) redirect(`/bizup/invoices/${existing.id}`);

  const { data: invoice, error } = await admin
    .from("bizup_documents")
    .insert({
      account_id: account.id,
      doc_type: "invoice",
      series: "INV",
      status: "draft",
      customer_id: doc.customer_id,
      // Sec 7: the link back to the quote this came from.
      parent_document_id: documentId,
      template_id: doc.template_id,
      notes: doc.notes,
      terms: doc.terms,
      // Recomputed from the copied lines below rather than trusted from
      // the quote, so a VAT status that changed between quoting and
      // invoicing is applied correctly.
      vat_rate: isVatVendor(account.vat_number) ? doc.vat_rate : 0,
    })
    .select("id")
    .single();

  if (error || !invoice) {
    console.error("Failed to convert KatisoBiz quote", error);
    return;
  }

  const { data: lines } = await admin
    .from("bizup_document_lines")
    .select("*")
    .eq("document_id", documentId)
    .order("line_no");

  if (lines?.length) {
    await admin.from("bizup_document_lines").insert(
      lines.map((l) => ({
        document_id: invoice.id,
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

  await recalcDocumentTotals(invoice.id, isVatVendor(account.vat_number));

  // Sec 6: the quote's own lifecycle ends here.
  await admin.from("bizup_documents").update({ status: "converted" }).eq("id", documentId);

  await admin.from("bizup_audit_log").insert({
    account_id: account.id,
    document_id: invoice.id,
    action: "quote_converted_to_invoice",
    from_status: doc.status,
    to_status: "draft",
    reason: `From quote ${doc.number}`,
  });

  revalidatePath("/bizup/invoices");
  redirect(`/bizup/invoices/${invoice.id}`);
}
