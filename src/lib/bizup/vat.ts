// KatisoBiz VAT rules (BizUp/docs/bizup-phase1-spec.md Sec 3).
//
// Sec 3.1 calls VAT status "the single most important rule in the
// product", so every decision that depends on it lives in this one file
// rather than being re-derived at each call site. A component asks this
// module what to render; it never inspects vat_number itself.

import { lineTotalCents, roundCents } from "./money";

/**
 * Settings that SARS can change, loaded from bizup_settings rather than
 * hardcoded (Sec 3.5). Shaped as an interface so a caller must pass real
 * loaded values, not fall back to a default that has quietly gone stale.
 */
export interface BizUpSettings {
  vatRate: number;
  vatVoluntaryThresholdCents: number;
  vatCompulsoryThresholdCents: number;
  fullTaxInvoiceThresholdCents: number;
  formalInvoiceMinimumCents: number;
  correctionWindowDays: number;
  draftNudgeDays: number;
}

// ============================================================
// Sec 3.4: VAT number validation
// ============================================================

/**
 * Format check only. Sec 3.4 is explicit that we must not claim to verify
 * against SARS, only that the number is the right shape: 10 digits,
 * beginning with 4.
 */
export function isValidVatNumberFormat(vatNumber: string): boolean {
  return /^4\d{9}$/.test(vatNumber.replace(/\s/g, ""));
}

/** Strips spacing so a number typed off a VAT 103 certificate stores consistently. */
export function normaliseVatNumber(vatNumber: string): string {
  return vatNumber.replace(/\s/g, "");
}

/**
 * Sec 3.4, shown at the point of entry. Deliberately does not say
 * "verified" or "valid", because we have checked the shape and nothing
 * more.
 */
export const VAT_NUMBER_HELP = "Please check this against your VAT 103 certificate from SARS.";

/** Sec 3.4, the confirmation shown the first time a VAT number is added. */
export const VAT_ACTIVATION_CONFIRMATION =
  "From now on your invoices will include 15% VAT and will be titled Tax Invoice. Documents you have already issued will not change.";

// ============================================================
// Sec 3.1: VAT status drives everything
// ============================================================

/**
 * A member is a VAT vendor when a correctly formatted VAT number is on
 * file, and not otherwise. The format check is repeated here rather than
 * trusted from entry time, so a row edited directly in the database cannot
 * flip a member into charging VAT on a malformed number.
 */
export function isVatVendor(vatNumber: string | null | undefined): boolean {
  return !!vatNumber && isValidVatNumberFormat(vatNumber);
}

export type DocType = "quote" | "invoice" | "credit_note";

/**
 * Sec 3.1. A non-vendor's document is titled "Invoice", never "Tax
 * Invoice" -- issuing a document headed "Tax Invoice" without being
 * registered is the one mistake in this product with a direct penalty
 * attached.
 */
export function documentTitle(docType: DocType, vatVendor: boolean): string {
  if (docType === "quote") return "Quotation";
  if (docType === "credit_note") return vatVendor ? "Tax Credit Note" : "Credit Note";
  return vatVendor ? "Tax Invoice" : "Invoice";
}

/**
 * Sec 3.1. Printed small on a non-vendor's document. A VAT vendor gets no
 * such line, because their VAT number and the VAT row say it already.
 */
export function nonVendorFooterLine(vatVendor: boolean): string | null {
  return vatVendor ? null : "Not a VAT vendor. No VAT charged.";
}

// ============================================================
// Totals
// ============================================================

export interface DocumentLineInput {
  quantity: number;
  unitPriceExclCents: number;
}

export interface DocumentTotals {
  subtotalExclCents: number;
  vatCents: number;
  totalInclCents: number;
  /** Snapshotted onto the document (Sec 4 rule 2), never re-read at render time. */
  vatRate: number;
}

/**
 * Sec 3.1 and Sec 4 rule 2.
 *
 * A non-vendor gets vatRate 0 and no VAT amount, not a hidden or
 * zero-valued VAT row. The rate used is returned so the caller stores it
 * on the document: if the national rate ever changes, every historical
 * document must still show the rate that applied on the day it was issued.
 */
export function calculateTotals(
  lines: DocumentLineInput[],
  settings: BizUpSettings,
  vatVendor: boolean,
): DocumentTotals {
  const subtotalExclCents = lines.reduce(
    (sum, line) => sum + lineTotalCents(line.quantity, line.unitPriceExclCents),
    0,
  );

  const vatRate = vatVendor ? settings.vatRate : 0;
  // Rounded once, on the subtotal. See the rounding rule documented in
  // money.ts for why this is not summed per line.
  const vatCents = roundCents(subtotalExclCents * vatRate);

  return {
    subtotalExclCents,
    vatCents,
    totalInclCents: subtotalExclCents + vatCents,
    vatRate,
  };
}

// ============================================================
// Sec 3.2: the R5,000 threshold (VAT vendors only)
// ============================================================

export type TaxInvoiceLevel = "none_required" | "abridged" | "full";

/**
 * Sec 3.2, based on the VAT-inclusive total.
 *
 * Only meaningful for a VAT vendor. A non-vendor is not issuing a tax
 * invoice at any value, so the whole ladder is irrelevant to them and the
 * caller should not be showing customer-VAT-number fields at all.
 */
export function taxInvoiceLevel(
  totalInclCents: number,
  settings: BizUpSettings,
  vatVendor: boolean,
): TaxInvoiceLevel {
  if (!vatVendor) return "none_required";
  if (totalInclCents <= settings.formalInvoiceMinimumCents) return "none_required";
  if (totalInclCents <= settings.fullTaxInvoiceThresholdCents) return "abridged";
  return "full";
}

/**
 * Sec 3.2: over R5,000 the customer's legal name and physical address
 * become required. Sec 3.2 also says to block issue, not editing -- so
 * this is only ever consulted at the point of issuing, never while the
 * member is still building the document.
 */
export function missingFullTaxInvoiceFields(
  customer: { name?: string | null; addressLine1?: string | null; city?: string | null },
  totalInclCents: number,
  settings: BizUpSettings,
  vatVendor: boolean,
): string[] {
  if (taxInvoiceLevel(totalInclCents, settings, vatVendor) !== "full") return [];

  const missing: string[] = [];
  if (!customer.name?.trim()) missing.push("Customer name");
  if (!customer.addressLine1?.trim()) missing.push("Customer street address");
  if (!customer.city?.trim()) missing.push("Customer city or town");
  return missing;
}

/**
 * Sec 3.2: shown inline and non-blocking the moment a vendor's running
 * total crosses R5,000 while the document is still being built.
 */
export const FULL_TAX_INVOICE_NOTICE =
  "This invoice is over R5,000, so SARS needs your customer's full name and address on it. We have opened those fields for you below.";

// ============================================================
// Sec 3.5(a): the rolling twelve-month VAT turnover tracker
// ============================================================

export type VatTrackerMarker = "below_voluntary" | "voluntary_available" | "compulsory";

export interface VatTrackerState {
  marker: VatTrackerMarker;
  rollingTotalCents: number;
  message: string | null;
}

/**
 * Sec 3.5(a). The window is a rolling twelve months, meaning any
 * consecutive twelve-month period. SARS tests it that way, so this
 * recomputes continuously and must never be reset at a financial year end
 * -- financial_year_end_month exists only to group reports (Sec 3.5(b))
 * and has no bearing on this calculation.
 */
export function vatTrackerState(
  rollingTotalCents: number,
  settings: BizUpSettings,
): VatTrackerState {
  if (rollingTotalCents >= settings.vatCompulsoryThresholdCents) {
    return {
      marker: "compulsory",
      rollingTotalCents,
      message: "You must register for VAT with SARS within 21 business days.",
    };
  }
  if (rollingTotalCents >= settings.vatVoluntaryThresholdCents) {
    return {
      marker: "voluntary_available",
      rollingTotalCents,
      message: "You can now choose to register for VAT with SARS. This is optional.",
    };
  }
  return { marker: "below_voluntary", rollingTotalCents, message: null };
}

/**
 * The start of the rolling twelve-month window ending at `asOf`. Kept here
 * next to the tracker so the window definition lives in one place and
 * cannot drift apart from the rule it serves.
 */
export function rollingWindowStart(asOf: Date = new Date()): Date {
  const start = new Date(asOf);
  start.setFullYear(start.getFullYear() - 1);
  return start;
}

// ============================================================
// Sec 3.6: liability language
// ============================================================

/**
 * Sec 3.6 requires this on every report and in the terms of service. Sec
 * 3.6 also forbids "SARS compliant" or "guaranteed compliant" anywhere in
 * the product; "SARS-ready" is the approved phrasing.
 */
export const LIABILITY_NOTICE =
  "KatisoBiz helps you produce compliant documents but you remain responsible for your own tax affairs. Complex cases should go to a tax practitioner or SARS.";
