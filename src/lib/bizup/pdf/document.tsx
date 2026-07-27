import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { formatZar } from "@/lib/bizup/money";
import { documentTitle, nonVendorFooterLine, type DocType } from "@/lib/bizup/vat";
import { bankNoticeText, type BankNoticeStyle } from "@/lib/bizup/bank";

// BizUp/docs/bizup-phase1-spec.md Sec 10, all five templates.
//
// "One data structure, five visual skins. Every skin must render every
// mandatory field. No minimal template may drop the VAT number, the
// invoice number, or the supplier address."
//
// That rule is enforced structurally rather than by reviewing each skin.
// The mandatory fields live inside the shared blocks below, and a skin
// composes blocks; it does not lay out its own header or totals. Dropping
// the VAT number would mean deleting a shared component, which would break
// all five at once and be obvious.

export interface PdfLine {
  description: string;
  quantity: number;
  unit: string;
  unit_price_excl_cents: number;
  line_total_excl_cents: number;
}

export interface PdfDocumentData {
  docType: DocType;
  number: string | null;
  issueDate: string | null;
  dueDate: string | null;
  validUntil: string | null;
  vatRate: number;
  subtotalExclCents: number;
  vatAmountCents: number;
  totalInclCents: number;
  notes: string | null;
  terms: string | null;
  lines: PdfLine[];
  /**
   * Money already received against this invoice, most often a deposit or
   * cash taken before the invoice was written.
   *
   * Deliberately not a negative line. A minus line would reduce the
   * subtotal, and VAT is calculated on the subtotal, so a vendor would
   * declare VAT on less than they actually sold. A payment does not reduce
   * what was supplied, it only reduces what is still owed, so it sits
   * below the total and leaves the taxable value untouched.
   */
  payments?: { paid_at: string; amount_cents: number; method: string }[];
  /** Sec 10, the Trade template. Blank on the other four. */
  jobReference?: string | null;
  siteAddress?: string | null;
  technicianName?: string | null;
  issuer: {
    business_name: string;
    trading_name?: string | null;
    vat_number?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    is_vat_vendor: boolean;
    /** Public URL of the member own logo, R49 and above. Null on free. */
    logo_url?: string | null;
  };
  customer: { name: string; vat_number?: string | null; address?: string | null } | null;
  bank: {
    bank_name: string;
    account_holder: string;
    account_number_masked: string;
    branch_code: string;
    account_type: string;
    notice_style: string;
    notice_phone: string | null;
  } | null;
}

export type TemplateId = "clean" | "bold" | "compact" | "classic" | "trade";

const base = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  pageCompact: { padding: 26, fontSize: 7.5, fontFamily: "Helvetica", color: "#1a1a1a" },
  pageClassic: { padding: 48, fontSize: 9.5, fontFamily: "Times-Roman", color: "#111" },
  bold: { fontFamily: "Helvetica-Bold" },
  boldSerif: { fontFamily: "Times-Bold" },
  row: { flexDirection: "row" },
  between: { flexDirection: "row", justifyContent: "space-between" },
  right: { textAlign: "right" },
  th: { fontSize: 8, color: "#555" },
  line: { borderBottomWidth: 0.5, borderBottomColor: "#ddd", paddingVertical: 4 },
  notice: { marginTop: 10, padding: 8, backgroundColor: "#fff7e6", fontSize: 8 },
  draft: { color: "#b91c1c", fontSize: 10, marginTop: 4 },
  footer: { position: "absolute", bottom: 26, left: 40, right: 40, fontSize: 7, color: "#888", textAlign: "center" },
});

const BRAND = "#0f2d52";

// ============================================================
// Shared blocks. Every mandatory field lives in here.
// ============================================================

/** Supplier identity. Carries the supplier address and, for a vendor, the VAT number. Both mandatory on every skin. */
function IssuerBlock({ data, serif = false, align = "right", color }: { data: PdfDocumentData; serif?: boolean; align?: "left" | "right"; color?: string }) {
  const b = serif ? base.boldSerif : base.bold;
  const ink = color ?? "#1a1a1a";
  return (
    <View style={[align === "right" ? base.right : {}, { color: ink }]}>
      {/* The member's own logo, an R49 feature. Rendered in the shared
          issuer block so every one of the five templates gets it without
          five separate implementations to keep in step, which is the same
          reasoning Sec 10 gives for the mandatory fields.

          Height is fixed and width follows the image, so a tall logo and a
          wide one both sit on one line rather than pushing the address off
          the page. objectFit keeps it from stretching. */}
      {data.issuer.logo_url ? (
        // This is @react-pdf/renderer's Image, not an HTML img or
        // next/image. It has no alt prop, and the output is a PDF rather
        // than a web page, so the accessibility rule does not apply.
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image
          src={data.issuer.logo_url}
          style={{
            height: 34,
            marginBottom: 6,
            objectFit: "contain",
            alignSelf: align === "right" ? "flex-end" : "flex-start",
          }}
        />
      ) : null}
      <Text style={[b, { fontSize: 12, color: ink }]}>{data.issuer.business_name}</Text>
      {data.issuer.trading_name ? <Text style={{ color: ink }}>trading as {data.issuer.trading_name}</Text> : null}
      {data.issuer.address ? <Text style={{ color: ink }}>{data.issuer.address}</Text> : null}
      {data.issuer.is_vat_vendor && data.issuer.vat_number ? (
        <Text style={{ color: ink }}>VAT No. {data.issuer.vat_number}</Text>
      ) : null}
      {data.issuer.phone ? <Text style={{ color: ink }}>{data.issuer.phone}</Text> : null}
      {data.issuer.email ? <Text style={{ color: ink }}>{data.issuer.email}</Text> : null}
    </View>
  );
}

/** Title and the document number. A draft says so, because a draft correctly has no number (Sec 5). */
function TitleBlock({ data, serif = false, color }: { data: PdfDocumentData; serif?: boolean; color?: string }) {
  const b = serif ? base.boldSerif : base.bold;

  // The colour applies to every line here, not only the heading. Bold puts
  // this block on a dark navy band, and previously only the title took the
  // white: the number and the dates kept the page's dark default and were
  // effectively invisible against the band. Found by Dewald on a real
  // invoice. A colour passed to a block has to reach everything in it.
  const ink = color ?? "#1a1a1a";

  return (
    <View style={{ color: ink }}>
      <Text style={[b, { fontSize: 20, color: ink }]}>
        {documentTitle(data.docType, data.issuer.is_vat_vendor)}
      </Text>
      {data.number ? (
        <Text style={{ marginTop: 4, color: ink }}>{data.number}</Text>
      ) : (
        // The draft warning is normally red. On a dark band red is no more
        // readable than the dark text was, so it takes the band's own ink
        // and leans on weight instead.
        <Text style={[base.draft, b, color ? { color: ink } : {}]}>DRAFT, NOT YET ISSUED</Text>
      )}
      {data.issueDate ? <Text style={{ color: ink }}>Issued {data.issueDate}</Text> : null}
      {data.dueDate ? <Text style={{ color: ink }}>Due {data.dueDate}</Text> : null}
      {data.validUntil ? <Text style={{ color: ink }}>Valid until {data.validUntil}</Text> : null}
    </View>
  );
}

function CustomerBlock({ data, serif = false }: { data: PdfDocumentData; serif?: boolean }) {
  if (!data.customer) return null;
  const b = serif ? base.boldSerif : base.bold;
  return (
    <View style={{ marginTop: 22 }}>
      <Text style={base.th}>{data.docType === "quote" ? "QUOTE FOR" : "BILL TO"}</Text>
      <Text style={[b, { marginTop: 3 }]}>{data.customer.name}</Text>
      {data.customer.address ? <Text>{data.customer.address}</Text> : null}
      {data.customer.vat_number ? <Text>VAT No. {data.customer.vat_number}</Text> : null}
    </View>
  );
}

/** Sec 10, Trade only. Rendered whenever the facts exist. */
function JobBlock({ data, serif = false }: { data: PdfDocumentData; serif?: boolean }) {
  if (!data.jobReference && !data.siteAddress && !data.technicianName) return null;
  const b = serif ? base.boldSerif : base.bold;
  return (
    <View style={{ marginTop: 16, padding: 8, backgroundColor: "#f5f6f8" }}>
      <Text style={base.th}>JOB DETAILS</Text>
      {data.jobReference ? (
        <Text style={{ marginTop: 3 }}>
          <Text style={b}>Reference: </Text>
          {data.jobReference}
        </Text>
      ) : null}
      {data.siteAddress ? (
        <Text>
          <Text style={b}>Site: </Text>
          {data.siteAddress}
        </Text>
      ) : null}
      {data.technicianName ? (
        <Text>
          <Text style={b}>Attended by: </Text>
          {data.technicianName}
        </Text>
      ) : null}
    </View>
  );
}

function LinesTable({ data, serif = false, headerBg }: { data: PdfDocumentData; serif?: boolean; headerBg?: string }) {
  const b = serif ? base.boldSerif : base.bold;
  const cols = [
    { key: "d", w: "46%", align: "left" as const, label: "DESCRIPTION" },
    { key: "q", w: "13%", align: "right" as const, label: "QTY" },
    { key: "u", w: "13%", align: "right" as const, label: "UNIT" },
    { key: "p", w: "14%", align: "right" as const, label: "PRICE" },
    { key: "t", w: "14%", align: "right" as const, label: "TOTAL" },
  ];
  return (
    <View style={{ marginTop: 20 }}>
      <View style={[base.row, base.line, headerBg ? { backgroundColor: headerBg, paddingHorizontal: 4 } : {}]}>
        {cols.map((c) => (
          <Text key={c.key} style={[b, base.th, { width: c.w, textAlign: c.align, color: headerBg ? "#fff" : "#555" }]}>
            {c.label}
          </Text>
        ))}
      </View>
      {data.lines.map((l, i) => (
        <View key={i} style={[base.row, base.line]} wrap={false}>
          <Text style={{ width: "46%" }}>{l.description}</Text>
          <Text style={{ width: "13%", textAlign: "right" }}>{l.quantity}</Text>
          <Text style={{ width: "13%", textAlign: "right" }}>{l.unit}</Text>
          <Text style={{ width: "14%", textAlign: "right" }}>{formatZar(l.unit_price_excl_cents)}</Text>
          <Text style={{ width: "14%", textAlign: "right" }}>{formatZar(l.line_total_excl_cents)}</Text>
        </View>
      ))}
    </View>
  );
}

/** Sec 3.1: a non-vendor gets no VAT row at all, not a zero one. */
function TotalsBlock({ data, serif = false }: { data: PdfDocumentData; serif?: boolean }) {
  const b = serif ? base.boldSerif : base.bold;
  const vendor = data.issuer.is_vat_vendor;
  // Never on a quote: nothing has been paid against something that has not
  // been invoiced, and a "balance due" on a quote reads as a demand.
  const payments = data.docType === "invoice" ? (data.payments ?? []) : [];
  const paid = payments.reduce((sum, p) => sum + p.amount_cents, 0);
  return (
    <View style={{ marginTop: 14, alignSelf: "flex-end", width: "45%" }}>
      {vendor ? (
        <>
          <View style={base.between}>
            <Text>Subtotal (excl. VAT)</Text>
            <Text>{formatZar(data.subtotalExclCents)}</Text>
          </View>
          <View style={[base.between, { marginTop: 3 }]}>
            <Text>VAT @ {(data.vatRate * 100).toFixed(0)}%</Text>
            <Text>{formatZar(data.vatAmountCents)}</Text>
          </View>
        </>
      ) : null}
      <View style={[base.between, { marginTop: 6, paddingTop: 6, borderTopWidth: 1 }]}>
        <Text style={b}>{data.docType === "quote" ? "Total" : paid > 0 ? "Total" : "Total due"}</Text>
        <Text style={b}>{formatZar(data.totalInclCents)}</Text>
      </View>
      {vendor ? <Text style={{ fontSize: 7, color: "#666" }}>Includes VAT</Text> : null}

      {/* Payments already received. The total above stays at the full
          value of the work, which is what SARS taxes; only the balance
          moves. A customer who paid a deposit needs to see both numbers
          or they will query the invoice. */}
      {paid > 0 ? (
        <>
          {payments.map((p, i) => (
            <View key={i} style={[base.between, { marginTop: 3 }]}>
              <Text>
                Less paid {p.paid_at}
                {p.method === "cash" ? " (cash)" : ""}
              </Text>
              <Text>- {formatZar(p.amount_cents)}</Text>
            </View>
          ))}
          <View style={[base.between, { marginTop: 6, paddingTop: 6, borderTopWidth: 1 }]}>
            <Text style={b}>Balance due</Text>
            <Text style={b}>{formatZar(Math.max(0, data.totalInclCents - paid))}</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

/** Sec 8: banking details plus the invoice interception fraud notice. */
function BankBlock({ data, serif = false }: { data: PdfDocumentData; serif?: boolean }) {
  if (!data.bank) return null;
  const notice = bankNoticeText(data.bank.notice_style as BankNoticeStyle, data.bank.notice_phone);
  return (
    <View style={{ marginTop: 18 }}>
      <Text style={[serif ? base.boldSerif : base.bold, base.th]}>BANKING DETAILS</Text>
      <Text style={{ marginTop: 3 }}>
        {data.bank.account_holder}, {data.bank.bank_name}, {data.bank.account_type}
      </Text>
      <Text>
        Account {data.bank.account_number_masked}, branch {data.bank.branch_code}
      </Text>
      {notice ? <Text style={base.notice}>{notice}</Text> : null}
    </View>
  );
}

function Endnotes({ data }: { data: PdfDocumentData }) {
  const nonVendor = nonVendorFooterLine(data.issuer.is_vat_vendor);
  return (
    <>
      {data.notes ? (
        <View style={{ marginTop: 16 }}>
          <Text style={base.th}>NOTES</Text>
          <Text style={{ marginTop: 3 }}>{data.notes}</Text>
        </View>
      ) : null}
      {data.terms ? (
        <View style={{ marginTop: 12 }}>
          <Text style={base.th}>TERMS</Text>
          <Text style={{ marginTop: 3 }}>{data.terms}</Text>
        </View>
      ) : null}
      {nonVendor ? <Text style={{ marginTop: 14, fontSize: 8, color: "#666" }}>{nonVendor}</Text> : null}
    </>
  );
}

/** Sec 2: on every tier, deliberately small. The acquisition engine, not a free-tier penalty. */
function BrandFooter() {
  return (
    <Text style={base.footer} fixed>
      Generated via KatisoBiz, DigitalFlyer SA
    </Text>
  );
}

// ============================================================
// The five skins (Sec 10)
// ============================================================

/** Clean: the default. Plain and legible, and the one that survives a cheap printer. */
function Clean({ data }: { data: PdfDocumentData }) {
  return (
    <Page size="A4" style={base.page}>
      <View style={base.between}>
        <TitleBlock data={data} />
        <IssuerBlock data={data} />
      </View>
      <CustomerBlock data={data} />
      <JobBlock data={data} />
      <LinesTable data={data} />
      <TotalsBlock data={data} />
      <BankBlock data={data} />
      <Endnotes data={data} />
      <BrandFooter />
    </Page>
  );
}

/** Bold: strong colour band, logo prominent. */
function Bold({ data }: { data: PdfDocumentData }) {
  return (
    <Page size="A4" style={[base.page, { paddingTop: 0 }]}>
      <View style={{ backgroundColor: BRAND, padding: 24, marginHorizontal: -40, marginBottom: 22 }}>
        <View style={base.between}>
          <TitleBlock data={data} color="#ffffff" />
          <IssuerBlock data={data} color="#ffffff" />
        </View>
      </View>
      <CustomerBlock data={data} />
      <JobBlock data={data} />
      <LinesTable data={data} headerBg={BRAND} />
      <TotalsBlock data={data} />
      <BankBlock data={data} />
      <Endnotes data={data} />
      <BrandFooter />
    </Page>
  );
}

/** Compact: fits a long job on one page. Tighter type and margins, same fields. */
function Compact({ data }: { data: PdfDocumentData }) {
  return (
    <Page size="A4" style={base.pageCompact}>
      <View style={base.between}>
        <TitleBlock data={data} />
        <IssuerBlock data={data} />
      </View>
      <CustomerBlock data={data} />
      <JobBlock data={data} />
      <LinesTable data={data} />
      <TotalsBlock data={data} />
      <BankBlock data={data} />
      <Endnotes data={data} />
      <BrandFooter />
    </Page>
  );
}

/** Classic: conservative serif, for members invoicing corporates or government. */
function Classic({ data }: { data: PdfDocumentData }) {
  return (
    <Page size="A4" style={base.pageClassic}>
      <View style={{ borderBottomWidth: 1, paddingBottom: 10 }}>
        <View style={base.between}>
          <TitleBlock data={data} serif />
          <IssuerBlock data={data} serif />
        </View>
      </View>
      <CustomerBlock data={data} serif />
      <JobBlock data={data} serif />
      <LinesTable data={data} serif />
      <TotalsBlock data={data} serif />
      <BankBlock data={data} serif />
      <Endnotes data={data} />
      <BrandFooter />
    </Page>
  );
}

/** Trade: leads with the job details, because on a site that is what gets checked first. */
function Trade({ data }: { data: PdfDocumentData }) {
  return (
    <Page size="A4" style={base.page}>
      <View style={base.between}>
        <TitleBlock data={data} />
        <IssuerBlock data={data} />
      </View>
      {/* The one skin where the job block sits above the customer, since a
          site supervisor checks the reference and the address before
          anything else. */}
      <JobBlock data={data} />
      <CustomerBlock data={data} />
      <LinesTable data={data} />
      <TotalsBlock data={data} />
      <BankBlock data={data} />
      <Endnotes data={data} />
      <BrandFooter />
    </Page>
  );
}

const SKINS: Record<TemplateId, (p: { data: PdfDocumentData }) => React.ReactElement> = {
  clean: Clean,
  bold: Bold,
  compact: Compact,
  classic: Classic,
  trade: Trade,
};

export const TEMPLATES: { id: TemplateId; name: string; description: string }[] = [
  { id: "clean", name: "Clean", description: "Plain and easy to read. Prints well on anything." },
  { id: "bold", name: "Bold", description: "Strong colour band across the top. Stands out in an inbox." },
  { id: "compact", name: "Compact", description: "Tighter layout, so a long job still fits on one page." },
  { id: "classic", name: "Classic", description: "Conservative and formal. For invoicing companies and government." },
  { id: "trade", name: "Trade", description: "Leads with the job reference, site address and who attended." },
];

export function isTemplateId(v: unknown): v is TemplateId {
  return typeof v === "string" && v in SKINS;
}

/**
 * The document, in whichever skin was active when it was issued.
 *
 * An unrecognised id falls back to Clean rather than failing, so a document
 * can never become unrenderable because a template was retired.
 */
export function BizUpDocument({ data, templateId }: { data: PdfDocumentData; templateId?: string | null }) {
  const Skin = isTemplateId(templateId) ? SKINS[templateId] : Clean;
  return (
    <Document>
      <Skin data={data} />
    </Document>
  );
}
