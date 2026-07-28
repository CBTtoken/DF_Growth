import { zipSync, strToU8 } from "fflate";
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { BizUpDocument, type PdfDocumentData } from "@/lib/bizup/pdf/document";
import { toCsv, csvAmount } from "@/lib/bizup/csv";
import { formatZar } from "@/lib/bizup/money";
import type { Period } from "@/lib/bizup/period";

// Spec Sec 12, the accountant export package.
//
// "Treat this as a referral channel, not a convenience feature." A South
// African accountant typically carries fifty to two hundred small business
// clients, so an accountant who receives a clean, well labelled export
// every month starts recommending the product. That framing is why the
// cover sheet exists at all and why it carries a discreet line about where
// the pack came from.
//
// The ZIP is built here, in memory, at the moment the link is opened. It is
// never stored: it contains third-party personal information, and an
// archive of a member's customer list sitting in a bucket is a liability
// with no upside.

// A hard ceiling on how many PDFs go into one pack. Rendering is the
// expensive part, and an unbounded loop over a five-year period would time
// out the request rather than fail honestly. The CSVs are never truncated,
// so the accountant still has every figure; only the PDF copies stop.
const MAX_PDFS = 150;

const cover = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  h1: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 18, marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  muted: { color: "#666" },
  footer: { position: "absolute", bottom: 40, left: 48, right: 48, fontSize: 8, color: "#888" },
});

function CoverSheet({
  businessName,
  vatNumber,
  period,
  totals,
  counts,
}: {
  businessName: string;
  vatNumber: string | null;
  period: Period;
  totals: { invoicedIncl: number; invoicedExcl: number; vat: number; credited: number; paid: number };
  counts: { invoices: number; creditNotes: number; payments: number; pdfs: number; pdfsTruncated: boolean };
}) {
  return (
    <Document>
      <Page size="A4" style={cover.page}>
        <Text style={cover.h1}>{businessName}</Text>
        <Text style={cover.muted}>
          Accounting records for {period.from} to {period.to}
        </Text>
        {vatNumber ? <Text style={cover.muted}>VAT number {vatNumber}</Text> : null}
        {!vatNumber ? (
          <Text style={cover.muted}>Not registered for VAT. No VAT was charged in this period.</Text>
        ) : null}

        <Text style={cover.h2}>Totals for the period</Text>
        <View style={cover.row}>
          <Text>Invoiced, excluding VAT</Text>
          <Text>{formatZar(totals.invoicedExcl)}</Text>
        </View>
        {vatNumber ? (
          <View style={cover.row}>
            <Text>VAT charged</Text>
            <Text>{formatZar(totals.vat)}</Text>
          </View>
        ) : null}
        <View style={cover.row}>
          <Text>Invoiced, including VAT</Text>
          <Text>{formatZar(totals.invoicedIncl)}</Text>
        </View>
        <View style={cover.row}>
          <Text>Credit notes issued</Text>
          <Text>{formatZar(totals.credited)}</Text>
        </View>
        <View style={cover.row}>
          <Text>Payments received</Text>
          <Text>{formatZar(totals.paid)}</Text>
        </View>

        <Text style={cover.h2}>What is in this pack</Text>
        <View style={cover.row}>
          <Text>invoices.csv</Text>
          <Text>{counts.invoices} invoices</Text>
        </View>
        <View style={cover.row}>
          <Text>credit-notes.csv</Text>
          <Text>{counts.creditNotes} credit notes</Text>
        </View>
        <View style={cover.row}>
          <Text>payments.csv</Text>
          <Text>{counts.payments} payments</Text>
        </View>
        {vatNumber ? (
          <View style={cover.row}>
            <Text>vat-summary.csv</Text>
            <Text>Output VAT by month</Text>
          </View>
        ) : null}
        <View style={cover.row}>
          <Text>documents/</Text>
          <Text>{counts.pdfs} PDFs</Text>
        </View>

        {counts.pdfsTruncated ? (
          <Text style={[cover.muted, { marginTop: 10 }]}>
            This period contains more documents than fit in one pack, so the PDF copies stop at{" "}
            {MAX_PDFS}. Every figure in the CSV files is complete. Export a shorter period for the
            remaining PDFs.
          </Text>
        ) : null}

        <Text style={[cover.muted, { marginTop: 18 }]}>
          Amounts are in South African Rand. Figures are taken from documents as they were issued
          and are not restated afterwards, so this pack matches what the customer received.
        </Text>

        {/* Sec 12: the referral hook. Kept discreet and professional,
            because the reader is a professional. */}
        <Text style={cover.footer}>
          Produced with KatisoBiz, from DigitalFlyer SA. katisobiz.co.za
        </Text>
      </Page>
    </Document>
  );
}

export interface ExportResult {
  zip: Uint8Array;
  filename: string;
}

export async function buildAccountantExport(
  accountId: string,
  period: Period,
): Promise<ExportResult | null> {
  const admin = createAdminClient();

  const { data: account } = await admin
    .from("bizup_accounts")
    .select("id, business_name, vat_number")
    .eq("id", accountId)
    .maybeSingle();
  if (!account) return null;

  const { data: docs } = await admin
    .from("bizup_documents")
    .select(
      "id, doc_type, number, issue_date, due_date, status, subtotal_excl_cents, vat_amount_cents, total_incl_cents, template_id, parent_document_id, bizup_customers(name)",
    )
    .eq("account_id", accountId)
    .in("doc_type", ["invoice", "credit_note"])
    .not("number", "is", null)
    .gte("issue_date", period.from)
    .lte("issue_date", period.to)
    .order("issue_date");

  const rows = docs ?? [];
  const invoices = rows.filter((d) => d.doc_type === "invoice");
  const creditNotes = rows.filter((d) => d.doc_type === "credit_note");

  const ids = rows.map((d) => d.id);
  const { data: payments } = ids.length
    ? await admin
        .from("bizup_payments")
        .select("document_id, paid_at, amount_cents, method, reference")
        .in("document_id", ids)
        .order("paid_at")
    : { data: [] };

  const numberById = new Map(rows.map((d) => [d.id, d.number ?? ""]));
  const customerName = (d: { bizup_customers?: unknown }) =>
    (d.bizup_customers as { name?: string } | null)?.name ?? "";

  // A paid date per invoice, which is what an accountant reconciles
  // against. The last payment is the one that settled it.
  const lastPaymentByDoc = new Map<string, string>();
  for (const p of payments ?? []) {
    lastPaymentByDoc.set(p.document_id, p.paid_at);
  }

  const files: Record<string, Uint8Array> = {};

  files["invoices.csv"] = strToU8(
    toCsv(
      ["Number", "Date", "Due date", "Customer", "Excluding VAT", "VAT", "Total", "Status", "Date paid"],
      invoices.map((d) => [
        d.number,
        d.issue_date,
        d.due_date ?? "",
        customerName(d),
        csvAmount(d.subtotal_excl_cents),
        csvAmount(d.vat_amount_cents),
        csvAmount(d.total_incl_cents),
        d.status,
        d.status === "paid" ? (lastPaymentByDoc.get(d.id) ?? "") : "",
      ]),
    ),
  );

  files["credit-notes.csv"] = strToU8(
    toCsv(
      ["Number", "Date", "Customer", "Excluding VAT", "VAT", "Total", "Against invoice"],
      creditNotes.map((d) => [
        d.number,
        d.issue_date,
        customerName(d),
        csvAmount(d.subtotal_excl_cents),
        csvAmount(d.vat_amount_cents),
        csvAmount(d.total_incl_cents),
        d.parent_document_id ? (numberById.get(d.parent_document_id) ?? "") : "",
      ]),
    ),
  );

  files["payments.csv"] = strToU8(
    toCsv(
      ["Date", "Amount", "Method", "Reference", "Invoice number"],
      (payments ?? []).map((p) => [
        p.paid_at,
        csvAmount(p.amount_cents),
        p.method,
        p.reference ?? "",
        numberById.get(p.document_id) ?? "",
      ]),
    ),
  );

  // Sec 12: VAT-registered members only. A non-vendor's pack would carry a
  // file of zeroes that implies they should have been charging VAT.
  if (account.vat_number) {
    const byMonth = new Map<string, { excl: number; vat: number; incl: number }>();
    for (const d of invoices) {
      const month = (d.issue_date ?? "").slice(0, 7);
      const bucket = byMonth.get(month) ?? { excl: 0, vat: 0, incl: 0 };
      bucket.excl += d.subtotal_excl_cents;
      bucket.vat += d.vat_amount_cents;
      bucket.incl += d.total_incl_cents;
      byMonth.set(month, bucket);
    }
    // Credit notes reduce output VAT in the month they were issued.
    for (const d of creditNotes) {
      const month = (d.issue_date ?? "").slice(0, 7);
      const bucket = byMonth.get(month) ?? { excl: 0, vat: 0, incl: 0 };
      bucket.excl -= d.subtotal_excl_cents;
      bucket.vat -= d.vat_amount_cents;
      bucket.incl -= d.total_incl_cents;
      byMonth.set(month, bucket);
    }

    files["vat-summary.csv"] = strToU8(
      toCsv(
        ["Month", "Sales excluding VAT", "Output VAT", "Sales including VAT"],
        [...byMonth.entries()]
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([month, b]) => [month, csvAmount(b.excl), csvAmount(b.vat), csvAmount(b.incl)]),
      ),
    );
  }

  // The PDFs. Rendered from each document's own snapshots, so the pack
  // contains exactly what the customer was sent.
  const toRender = rows.slice(0, MAX_PDFS);
  for (const d of toRender) {
    const { data: full } = await admin
      .from("bizup_documents")
      .select("*")
      .eq("id", d.id)
      .maybeSingle();
    if (!full?.issuer_snapshot) continue;

    const { data: lines } = await admin
      .from("bizup_document_lines")
      .select("*")
      .eq("document_id", d.id)
      .order("line_no");

    const { data: docPayments } = await admin
      .from("bizup_payments")
      .select("paid_at, amount_cents, method")
      .eq("document_id", d.id)
      .order("paid_at");

    const data: PdfDocumentData = {
      docType: full.doc_type,
      number: full.number,
      issueDate: full.issue_date,
      dueDate: full.due_date,
      validUntil: full.valid_until,
      vatRate: Number(full.vat_rate),
      subtotalExclCents: full.subtotal_excl_cents,
      vatAmountCents: full.vat_amount_cents,
      totalInclCents: full.total_incl_cents,
      notes: full.notes,
      terms: full.terms,
      jobReference: full.job_reference,
      siteAddress: full.site_address,
      technicianName: full.technician_name,
      payments: docPayments ?? [],
      lines: (lines ?? []).map((l) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unit: l.unit,
        unit_price_excl_cents: l.unit_price_excl_cents,
        line_total_excl_cents: l.line_total_excl_cents,
      })),
      issuer: full.issuer_snapshot,
      customer: full.customer_snapshot,
      bank: full.bank_snapshot,
    };

    const buffer = await renderToBuffer(
      <BizUpDocument data={data} templateId={full.template_id} />,
    );
    files[`documents/${full.number}.pdf`] = new Uint8Array(buffer);
  }

  const totals = {
    invoicedExcl: invoices.reduce((s, d) => s + d.subtotal_excl_cents, 0),
    vat: invoices.reduce((s, d) => s + d.vat_amount_cents, 0),
    invoicedIncl: invoices.reduce((s, d) => s + d.total_incl_cents, 0),
    credited: creditNotes.reduce((s, d) => s + d.total_incl_cents, 0),
    paid: (payments ?? []).reduce((s, p) => s + p.amount_cents, 0),
  };

  const coverBuffer = await renderToBuffer(
    <CoverSheet
      businessName={account.business_name}
      vatNumber={account.vat_number}
      period={period}
      totals={totals}
      counts={{
        invoices: invoices.length,
        creditNotes: creditNotes.length,
        payments: (payments ?? []).length,
        pdfs: toRender.length,
        pdfsTruncated: rows.length > MAX_PDFS,
      }}
    />,
  );
  files["cover.pdf"] = new Uint8Array(coverBuffer);

  const safeName = account.business_name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    zip: zipSync(files, { level: 6 }),
    filename: `${safeName}-accounting-${period.from}-to-${period.to}.zip`,
  };
}
