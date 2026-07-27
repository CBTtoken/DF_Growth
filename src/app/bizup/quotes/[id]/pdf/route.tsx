import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentAccount, buildIssuerSnapshot, buildBankSnapshot } from "@/lib/bizup/documents";
import { CleanDocument, type PdfDocumentData } from "@/lib/bizup/pdf/CleanDocument";

// @react-pdf/renderer needs Node, not the edge runtime. Measured at roughly
// 300ms cold and 150ms warm for a realistic 12 line invoice, which is why
// no headless Chrome and no external PDF service is involved. Keeping the
// render in our own runtime also means decrypted banking details are never
// sent to a third party (spec Sec 8).
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const account = await currentAccount();
  if (!account) return new Response("Not found", { status: 404 });

  const admin = createAdminClient();
  const [{ data: doc }, { data: lines }] = await Promise.all([
    admin
      .from("bizup_documents")
      .select("*, bizup_customers(name, vat_number, address_line1, address_line2, city, province, postal_code)")
      // Scoped to this account as well as the id. Returns 404 rather than
      // 403 for someone else's document, so the endpoint does not confirm
      // that an id exists.
      .eq("id", id)
      .eq("account_id", account.id)
      .maybeSingle(),
    admin.from("bizup_document_lines").select("*").eq("document_id", id).order("line_no"),
  ]);

  if (!doc) return new Response("Not found", { status: 404 });

  // Sec 4 rule 1: an issued document renders from its own snapshots and
  // never from the live account, so changing a business address later
  // cannot alter a document already sent. A draft has no snapshots yet, so
  // it previews against current details.
  const issuer = doc.issuer_snapshot ?? buildIssuerSnapshot(account);

  let bank = doc.bank_snapshot ?? null;
  if (!bank) {
    const { data: bankRow } = await admin
      .from("bizup_bank_details")
      // Deliberately does not select account_number_encrypted. Nothing in
      // the PDF needs the full number, only the masked form, so the decrypt
      // path stays unused here.
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
    terms: doc.terms,
    lines: (lines ?? []).map((l) => ({
      description: l.description,
      quantity: Number(l.quantity),
      unit: l.unit,
      unit_price_excl_cents: l.unit_price_excl_cents,
      line_total_excl_cents: l.line_total_excl_cents,
    })),
    issuer,
    customer,
    bank,
  };

  const buffer = await renderToBuffer(<CleanDocument data={data} />);
  const filename = `${doc.number ?? "draft"}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      // inline so a member can look at it on their phone before deciding to
      // send, rather than it landing in Downloads unseen.
      "Content-Disposition": `inline; filename="${filename}"`,
      // Sec 9: private document, never cached by an intermediary and never
      // indexed.
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
