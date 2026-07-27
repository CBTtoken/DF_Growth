import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatZar } from "@/lib/bizup/money";
import { documentTitle, nonVendorFooterLine, type DocType } from "@/lib/bizup/vat";
import { bankNoticeText, type BankNoticeStyle } from "@/lib/bizup/bank";

// BizUp/docs/bizup-phase1-spec.md Sec 10, the "Clean" template. The default
// because it is the one that survives a cheap printer.
//
// Sec 10 is explicit that one data structure drives all five skins and that
// "no minimal template may drop the VAT number, the invoice number, or the
// supplier address". This component takes the whole document and renders
// every mandatory field; a skin may restyle it but may not omit anything.

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
  issuer: {
    business_name: string;
    trading_name?: string | null;
    vat_number?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    is_vat_vendor: boolean;
  };
  customer: {
    name: string;
    vat_number?: string | null;
    address?: string | null;
  } | null;
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

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  bold: { fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row" },
  between: { flexDirection: "row", justifyContent: "space-between" },
  right: { textAlign: "right" },
  th: { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#555" },
  cellDesc: { width: "46%" },
  cellQty: { width: "13%", textAlign: "right" },
  cellUnit: { width: "13%", textAlign: "right" },
  cellPrice: { width: "14%", textAlign: "right" },
  cellTotal: { width: "14%", textAlign: "right" },
  line: { borderBottomWidth: 0.5, borderBottomColor: "#ddd", paddingVertical: 4 },
  notice: { marginTop: 10, padding: 8, backgroundColor: "#fff7e6", fontSize: 8 },
  draft: { color: "#b91c1c", fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 4 },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 40,
    right: 40,
    fontSize: 7,
    color: "#888",
    textAlign: "center",
  },
});

export function CleanDocument({ data }: { data: PdfDocumentData }) {
  const vendor = data.issuer.is_vat_vendor;
  const title = documentTitle(data.docType, vendor);
  const nonVendorLine = nonVendorFooterLine(vendor);
  const bankNotice = data.bank
    ? bankNoticeText(data.bank.notice_style as BankNoticeStyle, data.bank.notice_phone)
    : null;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.between}>
          <View>
            <Text style={s.title}>{title}</Text>
            {/* A draft has no number by design (Sec 5). Saying so on the page
                stops a preview being mistaken for an issued document. */}
            {data.number ? (
              <Text style={{ marginTop: 4 }}>{data.number}</Text>
            ) : (
              <Text style={s.draft}>DRAFT, NOT YET ISSUED</Text>
            )}
            {data.issueDate && <Text>Issued {data.issueDate}</Text>}
            {data.dueDate && <Text>Due {data.dueDate}</Text>}
            {data.validUntil && <Text>Valid until {data.validUntil}</Text>}
          </View>

          <View style={s.right}>
            <Text style={[s.bold, { fontSize: 12 }]}>{data.issuer.business_name}</Text>
            {data.issuer.trading_name && <Text>trading as {data.issuer.trading_name}</Text>}
            {data.issuer.address && <Text>{data.issuer.address}</Text>}
            {/* Sec 3.1: a vendor's VAT number is always printed. */}
            {vendor && data.issuer.vat_number && <Text>VAT No. {data.issuer.vat_number}</Text>}
            {data.issuer.phone && <Text>{data.issuer.phone}</Text>}
            {data.issuer.email && <Text>{data.issuer.email}</Text>}
          </View>
        </View>

        {data.customer && (
          <View style={{ marginTop: 24 }}>
            <Text style={s.th}>{data.docType === "quote" ? "QUOTE FOR" : "BILL TO"}</Text>
            <Text style={[s.bold, { marginTop: 3 }]}>{data.customer.name}</Text>
            {data.customer.address && <Text>{data.customer.address}</Text>}
            {data.customer.vat_number && <Text>VAT No. {data.customer.vat_number}</Text>}
          </View>
        )}

        <View style={{ marginTop: 22 }}>
          <View style={[s.row, s.line]}>
            <Text style={[s.th, s.cellDesc]}>DESCRIPTION</Text>
            <Text style={[s.th, s.cellQty]}>QTY</Text>
            <Text style={[s.th, s.cellUnit]}>UNIT</Text>
            <Text style={[s.th, s.cellPrice]}>PRICE</Text>
            <Text style={[s.th, s.cellTotal]}>TOTAL</Text>
          </View>
          {data.lines.map((l, i) => (
            <View key={i} style={[s.row, s.line]} wrap={false}>
              <Text style={s.cellDesc}>{l.description}</Text>
              <Text style={s.cellQty}>{l.quantity}</Text>
              <Text style={s.cellUnit}>{l.unit}</Text>
              <Text style={s.cellPrice}>{formatZar(l.unit_price_excl_cents)}</Text>
              <Text style={s.cellTotal}>{formatZar(l.line_total_excl_cents)}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 14, alignSelf: "flex-end", width: "45%" }}>
          {/* Sec 3.1: a non-vendor sees no VAT row at all, not a zero one. */}
          {vendor ? (
            <>
              <View style={s.between}>
                <Text>Subtotal (excl. VAT)</Text>
                <Text>{formatZar(data.subtotalExclCents)}</Text>
              </View>
              <View style={[s.between, { marginTop: 3 }]}>
                <Text>VAT @ {(data.vatRate * 100).toFixed(0)}%</Text>
                <Text>{formatZar(data.vatAmountCents)}</Text>
              </View>
            </>
          ) : null}
          <View style={[s.between, { marginTop: 6, paddingTop: 6, borderTopWidth: 1 }]}>
            {/* Sec 3.1: a quote from a vendor leads with the VAT inclusive
                total, per section 65 of the VAT Act. */}
            <Text style={s.bold}>{data.docType === "quote" ? "Total" : "Total due"}</Text>
            <Text style={s.bold}>{formatZar(data.totalInclCents)}</Text>
          </View>
          {vendor && <Text style={{ fontSize: 7, color: "#666" }}>Includes VAT</Text>}
        </View>

        {data.notes && (
          <View style={{ marginTop: 18 }}>
            <Text style={s.th}>NOTES</Text>
            <Text style={{ marginTop: 3 }}>{data.notes}</Text>
          </View>
        )}

        {data.bank && (
          <View style={{ marginTop: 18 }}>
            <Text style={s.th}>BANKING DETAILS</Text>
            <Text style={{ marginTop: 3 }}>
              {data.bank.account_holder}, {data.bank.bank_name}, {data.bank.account_type}
            </Text>
            <Text>
              Account {data.bank.account_number_masked}, branch {data.bank.branch_code}
            </Text>
            {/* Sec 8: the invoice interception fraud notice. */}
            {bankNotice && <Text style={s.notice}>{bankNotice}</Text>}
          </View>
        )}

        {data.terms && (
          <View style={{ marginTop: 14 }}>
            <Text style={s.th}>TERMS</Text>
            <Text style={{ marginTop: 3 }}>{data.terms}</Text>
          </View>
        )}

        {/* Sec 3.1, printed small on a non-vendor's document only. */}
        {nonVendorLine && (
          <Text style={{ marginTop: 14, fontSize: 8, color: "#666" }}>{nonVendorLine}</Text>
        )}

        {/* Sec 2: on every tier, deliberately small. This is the acquisition
            engine, not a free-tier penalty. */}
        <Text style={s.footer} fixed>
          Generated via BizUp, DigitalFlyer SA
        </Text>
      </Page>
    </Document>
  );
}
