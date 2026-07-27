import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentAccount, buildIssuerSnapshot, buildBankSnapshot } from "@/lib/bizup/documents";
import { BizUpDocument, type PdfDocumentData } from "@/lib/bizup/pdf/document";

// The member's own copy of a document as a PDF, shared by the quote and
// invoice routes so the two cannot drift apart. The customer's copy is
// rendered separately (bizup/d/[token]/pdf) because it renders from
// snapshots only and has no session to check.

export async function renderOwnedDocumentPdf(id: string): Promise<Response> {
  const account = await currentAccount();
  if (!account) return new Response("Not found", { status: 404 });

  const admin = createAdminClient();
  const [{ data: doc }, { data: lines }, { data: payments }] = await Promise.all([
    admin
      .from("bizup_documents")
      .select("*, bizup_customers(name, vat_number, address_line1, address_line2, city, province, postal_code)")
      .eq("id", id)
      // Scoped to this account as well as the id, since this runs with the
      // service role and bypasses RLS. 404 rather than 403, so the endpoint
      // never confirms that an id exists.
      .eq("account_id", account.id)
      .maybeSingle(),
    admin.from("bizup_document_lines").select("*").eq("document_id", id).order("line_no"),
    admin
      .from("bizup_payments")
      .select("paid_at, amount_cents, method")
      .eq("document_id", id)
      .order("paid_at"),
  ]);

  if (!doc) return new Response("Not found", { status: 404 });

  // Sec 4 rule 1: an issued document renders from its own snapshots and
  // never from the live account. A draft has none yet, so it previews
  // against current details.
  const issuer = doc.issuer_snapshot ?? buildIssuerSnapshot(account);

  let bank = doc.bank_snapshot ?? null;
  if (!bank) {
    const { data: bankRow } = await admin
      .from("bizup_bank_details")
      // Deliberately never selects account_number_encrypted: only the
      // masked form is printed, so the decrypt path stays unused here.
      .select("bank_name, account_holder, account_number_last4, branch_code, account_type")
      .eq("account_id", account.id)
      .maybeSingle();
    bank = buildBankSnapshot(bankRow ?? null, account.bank_notice_style, account.phone);
  }

  const customerRow = doc.bizup_customers as unknown as {
    name: string;
    vat_number: string | null;
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    province: string | null;
    postal_code: string | null;
  } | null;

  const customer =
    doc.customer_snapshot ??
    (customerRow
      ? {
          name: customerRow.name,
          vat_number: customerRow.vat_number,
          address: [
            customerRow.address_line1,
            customerRow.address_line2,
            customerRow.city,
            customerRow.province,
            customerRow.postal_code,
          ]
            .filter(Boolean)
            .join(", "),
        }
      : null);

  const data: PdfDocumentData = {
    docType: doc.doc_type,
    number: doc.number,
    issueDate: doc.issue_date,
    dueDate: doc.due_date,
    validUntil: doc.valid_until,
    vatRate: Number(doc.vat_rate),
    subtotalExclCents: doc.subtotal_excl_cents,
    vatAmountCents: doc.vat_amount_cents,
    totalInclCents: doc.total_incl_cents,
    notes: doc.notes,
    jobReference: doc.job_reference,
    siteAddress: doc.site_address,
    technicianName: doc.technician_name,
    terms: doc.terms,
    lines: (lines ?? []).map((l) => ({
      description: l.description,
      quantity: Number(l.quantity),
      unit: l.unit,
      unit_price_excl_cents: l.unit_price_excl_cents,
      line_total_excl_cents: l.line_total_excl_cents,
    })),
    payments: payments ?? [],
    issuer,
    customer,
    bank,
  };

  const buffer = await renderToBuffer(<BizUpDocument data={data} templateId={doc.template_id} />);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.number ?? "draft"}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
