"use server";

import { bizupLoginPath } from "@/lib/bizup/product";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentAccount, recalcDocumentTotals, computeLineTotal } from "@/lib/bizup/documents";
import { isVatVendor } from "@/lib/bizup/vat";
import { parseAmountToCents } from "@/lib/bizup/money";

// BizUp/docs/bizup-phase1-spec.md Sec 15.4, quote creation.
//
// Every action re-reads the account from the session and scopes its writes
// to it. These run with the service role and bypass RLS, so a document id
// arriving from a form is never trusted on its own.

async function ownedDocument(documentId: string) {
  const account = await currentAccount();
  if (!account) return null;

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("bizup_documents")
    .select("id, account_id, status, number, doc_type")
    .eq("id", documentId)
    .eq("account_id", account.id)
    .maybeSingle();

  return doc ? { account, doc, admin } : null;
}

/** Sec 7: drafts are freely editable, issued documents are not. */
function isEditable(doc: { number: string | null; status: string }): boolean {
  return doc.number === null && doc.status === "draft";
}

export async function createQuote(): Promise<void> {
  const account = await currentAccount();
  if (!account) redirect(await bizupLoginPath());

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bizup_documents")
    .insert({
      account_id: account.id,
      doc_type: "quote",
      series: "QUO",
      status: "draft",
      // Sec 10: the template in force when the document was created. Stored
      // per document so history renders the way it was sent.
      template_id: account.template_id,
      // Sec 4 rule 2: refreshed on every edit while a draft, frozen at issue.
      vat_rate: isVatVendor(account.vat_number) ? 0.15 : 0,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Failed to create BizUp quote", error);
    redirect("/bizup/quotes");
  }

  redirect(`/bizup/quotes/${data.id}`);
}

export async function addLine(formData: FormData): Promise<void> {
  const documentId = String(formData.get("documentId") ?? "");
  const owned = await ownedDocument(documentId);
  if (!owned) return;
  const { account, doc, admin } = owned;
  if (!isEditable(doc)) return;

  const catalogueItemId = String(formData.get("catalogueItemId") ?? "") || null;

  let description = String(formData.get("description") ?? "").trim();
  let unit = String(formData.get("unit") ?? "each");
  let unitPrice = parseAmountToCents(String(formData.get("unitPrice") ?? "")) ?? 0;

  // A line added from the price list copies the values onto the document
  // rather than referencing them. Sec 4 rule 1's logic applies here too: if
  // the member raises their hourly rate next month, this quote must not
  // change. catalogue_item_id is kept for reporting only.
  if (catalogueItemId) {
    const { data: item } = await admin
      .from("bizup_catalogue_items")
      .select("name, unit, unit_price_excl_cents, default_markup_pct")
      .eq("id", catalogueItemId)
      .eq("account_id", account.id)
      .maybeSingle();
    if (item) {
      description = item.name;
      unit = item.unit;
      unitPrice = item.default_markup_pct
        ? Math.round(item.unit_price_excl_cents * (1 + Number(item.default_markup_pct) / 100))
        : item.unit_price_excl_cents;
    }
  }

  if (!description) return;

  const quantity = Number(formData.get("quantity") ?? 1) || 1;

  // line_no is the display order. Taking max+1 rather than counting rows
  // keeps numbering stable after a line in the middle is removed.
  const { data: last } = await admin
    .from("bizup_document_lines")
    .select("line_no")
    .eq("document_id", documentId)
    .order("line_no", { ascending: false })
    .limit(1)
    .maybeSingle();

  await admin.from("bizup_document_lines").insert({
    document_id: documentId,
    line_no: (last?.line_no ?? 0) + 1,
    catalogue_item_id: catalogueItemId,
    description,
    quantity,
    unit,
    unit_price_excl_cents: unitPrice,
    line_total_excl_cents: computeLineTotal(quantity, unitPrice),
  });

  await recalcDocumentTotals(documentId, isVatVendor(account.vat_number));
  revalidatePath(`/bizup/quotes/${documentId}`);
}

export async function updateLine(formData: FormData): Promise<void> {
  const documentId = String(formData.get("documentId") ?? "");
  const lineId = String(formData.get("lineId") ?? "");
  const owned = await ownedDocument(documentId);
  if (!owned || !lineId) return;
  const { account, doc, admin } = owned;
  if (!isEditable(doc)) return;

  const description = String(formData.get("description") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 1) || 0;
  const unitPrice = parseAmountToCents(String(formData.get("unitPrice") ?? "")) ?? 0;

  if (!description || quantity <= 0) return;

  await admin
    .from("bizup_document_lines")
    .update({
      description,
      quantity,
      unit_price_excl_cents: unitPrice,
      line_total_excl_cents: computeLineTotal(quantity, unitPrice),
    })
    .eq("id", lineId)
    .eq("document_id", documentId);

  await recalcDocumentTotals(documentId, isVatVendor(account.vat_number));
  revalidatePath(`/bizup/quotes/${documentId}`);
}

export async function removeLine(formData: FormData): Promise<void> {
  const documentId = String(formData.get("documentId") ?? "");
  const lineId = String(formData.get("lineId") ?? "");
  const owned = await ownedDocument(documentId);
  if (!owned || !lineId) return;
  const { account, doc, admin } = owned;
  if (!isEditable(doc)) return;

  await admin.from("bizup_document_lines").delete().eq("id", lineId).eq("document_id", documentId);
  await recalcDocumentTotals(documentId, isVatVendor(account.vat_number));
  revalidatePath(`/bizup/quotes/${documentId}`);
}

export async function updateQuoteMeta(formData: FormData): Promise<void> {
  const documentId = String(formData.get("documentId") ?? "");
  const owned = await ownedDocument(documentId);
  if (!owned) return;
  const { account, doc, admin } = owned;
  if (!isEditable(doc)) return;

  const customerId = String(formData.get("customerId") ?? "") || null;

  // A customer id from a form field is checked against this account before
  // it is stored, not trusted because it arrived in a request.
  if (customerId) {
    const { data: customer } = await admin
      .from("bizup_customers")
      .select("id")
      .eq("id", customerId)
      .eq("account_id", account.id)
      .maybeSingle();
    if (!customer) return;
  }

  const validUntil = String(formData.get("validUntil") ?? "") || null;

  await admin
    .from("bizup_documents")
    .update({
      customer_id: customerId,
      notes: String(formData.get("notes") ?? "").trim() || null,
      terms: String(formData.get("terms") ?? "").trim() || null,
      valid_until: validUntil,
    })
    .eq("id", documentId);

  revalidatePath(`/bizup/quotes/${documentId}`);
}

/**
 * Sec 7: "Drafts have no number and can be deleted freely." The number
 * check is what stops this ever becoming the ability to delete an issued
 * document, so it is enforced here rather than by hiding the button.
 */
export async function deleteDraftQuote(formData: FormData): Promise<void> {
  const documentId = String(formData.get("documentId") ?? "");
  const owned = await ownedDocument(documentId);
  if (!owned) return;
  const { doc, admin } = owned;

  if (!isEditable(doc)) {
    redirect(`/bizup/quotes/${documentId}`);
  }

  // Lines cascade with the document, which is safe precisely because this
  // only ever runs for a numberless draft.
  await admin.from("bizup_documents").delete().eq("id", documentId).is("number", null);

  revalidatePath("/bizup/quotes");
  redirect("/bizup/quotes");
}
