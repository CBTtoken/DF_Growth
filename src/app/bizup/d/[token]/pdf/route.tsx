import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { BizUpDocument, type PdfDocumentData } from "@/lib/bizup/pdf/document";

export const runtime = "nodejs";

// BizUp/docs/bizup-phase1-spec.md Sec 9, the customer's copy of the PDF.
//
// Unauthenticated by design, same as the page beside it: the customer has
// a link, not an account. Security is the unguessable token, and the
// member can revoke it.
//
// This renders exclusively from the document's own snapshots. It never
// reads the live account, never touches bizup_bank_details, and therefore
// never has any path to the encrypted account number. A customer opening
// this six months from now sees exactly what they were sent.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("bizup_documents")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();

  if (!doc) return new Response("Not found", { status: 404 });

  const { data: lines } = await admin
    .from("bizup_document_lines")
    .select("*")
    .eq("document_id", doc.id)
    .order("line_no");

  const issuer = doc.issuer_snapshot as PdfDocumentData["issuer"] | null;
  // An issued document always has an issuer snapshot. If it somehow does
  // not, refusing is correct: rendering a tax document from guessed
  // supplier details would be worse than a 404.
  if (!issuer) return new Response("Not found", { status: 404 });

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
    issuer,
    customer: doc.customer_snapshot as PdfDocumentData["customer"],
    bank: doc.bank_snapshot as PdfDocumentData["bank"],
  };

  const buffer = await renderToBuffer(<BizUpDocument data={data} templateId={doc.template_id} />);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.number ?? "document"}.pdf"`,
      // Sec 9: this file carries customer details and banking details.
      // A metadata robots tag on the page does not cover a downloaded
      // file, so the header is set here as well.
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "private, no-store",
    },
  });
}
