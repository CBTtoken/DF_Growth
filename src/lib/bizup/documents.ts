import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateTotals, isVatVendor, type BizUpSettings } from "./vat";
import { lineTotalCents } from "./money";
import { bizupLogoUrl } from "./logo";
import { decrypt } from "@/lib/crypto";

// BizUp/docs/bizup-phase1-spec.md Sec 4, 5 and 6. Shared document logic,
// kept out of the Server Actions so totals are computed in exactly one
// place and cannot drift between the builder, the PDF and the reports.

export interface DocumentLine {
  id: string;
  line_no: number;
  catalogue_item_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price_excl_cents: number;
  line_total_excl_cents: number;
  tax_code: string;
}

export interface BizUpAccountRow {
  id: string;
  business_name: string;
  trading_name: string | null;
  vat_number: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  template_id: string;
  bank_notice_style: string;
  insurance_pricing_enabled: boolean;
  logo_path: string | null;
}

/** The signed-in member's account, or null. Every document action starts here. */
export async function currentAccount(): Promise<BizUpAccountRow | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("bizup_accounts")
    .select(
      "id, business_name, trading_name, vat_number, address_line1, address_line2, city, province, postal_code, email, phone, whatsapp, template_id, bank_notice_style, insurance_pricing_enabled, logo_path"
    )
    .eq("owner_user_id", user.id)
    .maybeSingle();
  return data ?? null;
}

/** Sec 3.5: thresholds and the VAT rate are configurable, never hardcoded. */
export async function loadSettings(): Promise<BizUpSettings> {
  const admin = createAdminClient();
  const { data } = await admin.from("bizup_settings").select("*").single();
  return {
    vatRate: Number(data.vat_rate),
    vatVoluntaryThresholdCents: Number(data.vat_voluntary_threshold_cents),
    vatCompulsoryThresholdCents: Number(data.vat_compulsory_threshold_cents),
    fullTaxInvoiceThresholdCents: Number(data.full_tax_invoice_threshold_cents),
    formalInvoiceMinimumCents: Number(data.formal_invoice_minimum_cents),
    correctionWindowDays: data.correction_window_days,
    draftNudgeDays: data.draft_nudge_days,
  };
}

/**
 * Recomputes a document's totals from its own lines and saves them.
 *
 * Called after every line change. Totals are never trusted from the
 * client, and never computed in two places: the builder's running total,
 * the PDF and every report all read what this wrote.
 *
 * Sec 4 rule 2: the VAT rate in force at the time is written onto the
 * document. For a draft that is simply refreshed on each edit; once
 * issued, nothing recalculates it again.
 */
export async function recalcDocumentTotals(documentId: string, vatVendor: boolean) {
  const admin = createAdminClient();
  const settings = await loadSettings();

  const { data: lines } = await admin
    .from("bizup_document_lines")
    .select("quantity, unit_price_excl_cents")
    .eq("document_id", documentId);

  const totals = calculateTotals(
    (lines ?? []).map((l) => ({
      quantity: Number(l.quantity),
      unitPriceExclCents: l.unit_price_excl_cents,
    })),
    settings,
    vatVendor,
  );

  await admin
    .from("bizup_documents")
    .update({
      subtotal_excl_cents: totals.subtotalExclCents,
      vat_amount_cents: totals.vatCents,
      total_incl_cents: totals.totalInclCents,
      vat_rate: totals.vatRate,
    })
    .eq("id", documentId);

  return totals;
}

/** Keeps line_total_excl_cents consistent with quantity and price in one place. */
export function computeLineTotal(quantity: number, unitPriceExclCents: number): number {
  return lineTotalCents(quantity, unitPriceExclCents);
}

/**
 * Sec 4 rule 1: the issuer's details frozen onto the document.
 *
 * Built at issue, never re-read afterwards. If the member changes their
 * business address in six months, historical documents must not change.
 */
export function buildIssuerSnapshot(account: BizUpAccountRow) {
  return {
    business_name: account.business_name,
    trading_name: account.trading_name,
    vat_number: account.vat_number,
    address: [account.address_line1, account.address_line2, account.city, account.province, account.postal_code]
      .filter(Boolean)
      .join(", "),
    email: account.email,
    phone: account.phone,
    whatsapp: account.whatsapp,
    is_vat_vendor: isVatVendor(account.vat_number),
    // Snapshotted like everything else here, per Sec 4 rule 1: a member who
    // rebrands next year must not have last year's invoices silently
    // restamped with the new logo. The stored path also keeps working after
    // a replacement, because uploads are timestamped rather than
    // overwriting one filename.
    logo_url: bizupLogoUrl(account.logo_path),
  };
}

export interface CustomerRow {
  id: string;
  name: string;
  is_business: boolean;
  vat_number: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
}

export function buildCustomerSnapshot(customer: CustomerRow | null) {
  if (!customer) return null;
  return {
    name: customer.name,
    is_business: customer.is_business,
    vat_number: customer.vat_number,
    email: customer.email,
    phone: customer.phone,
    whatsapp: customer.whatsapp,
    address: [customer.address_line1, customer.address_line2, customer.city, customer.province, customer.postal_code]
      .filter(Boolean)
      .join(", "),
  };
}

/**
 * The member's banking details, with the account number decrypted, ready to
 * print on a document.
 *
 * One function for all three places that build a bank snapshot, so the
 * decrypt cannot be wired into two of them and forgotten in the third.
 * Returns null when the member has not set banking details up, which is a
 * normal state for a quote and blocks nothing.
 */
export async function loadBankForDocument(accountId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bizup_bank_details")
    .select(
      "bank_name, account_holder, account_number_last4, account_number_encrypted, branch_code, account_type",
    )
    .eq("account_id", accountId)
    .maybeSingle();

  if (!data) return null;

  // A decrypt failure must not take the whole document down. Falling back
  // to the masked form keeps the invoice renderable and visibly wrong,
  // which a member will report, rather than throwing and leaving them with
  // no document at all.
  let accountNumber = `••••••${data.account_number_last4}`;
  try {
    if (data.account_number_encrypted) accountNumber = decrypt(data.account_number_encrypted);
  } catch (err) {
    console.error("Failed to decrypt KatisoBiz bank account number", err);
  }

  return { ...data, account_number: accountNumber };
}

export function buildBankSnapshot(
  bank: {
    bank_name: string;
    account_holder: string;
    account_number_last4: string;
    branch_code: string;
    account_type: string;
    /**
     * The full number, already decrypted by the caller.
     *
     * Dewald, on a real invoice: "the account number has *** in it, no way
     * a client will be able to pay now". He is right, and this was my
     * mistake. Masking is correct on our own screens and completely wrong
     * on the document itself: printing banking details a customer cannot
     * pay into defeats the only reason they are on an invoice at all.
     *
     * Held in the snapshot rather than decrypted at render time because
     * the customer's copy renders from snapshots only and has no session.
     * The trade-off is deliberate: bizup_bank_details stays encrypted at
     * rest as the source of truth, and the snapshot records what the
     * document actually said, which necessarily included the number. A
     * document already shared on an unauthenticated link is not made more
     * exposed by holding the figure it printed.
     */
    account_number: string;
  } | null,
  noticeStyle: string,
  phone: string | null,
) {
  if (!bank) return null;
  return {
    bank_name: bank.bank_name,
    account_holder: bank.account_holder,
    account_number: bank.account_number,
    account_number_masked: `••••••${bank.account_number_last4}`,
    branch_code: bank.branch_code,
    account_type: bank.account_type,
    notice_style: noticeStyle,
    notice_phone: phone,
  };
}

/** Sec 5: QUO-2026-0001. Padding is fixed at 4 so numbers sort correctly as text. */
export function formatDocumentNumber(series: string, year: number, value: number): string {
  return `${series}-${year}-${String(value).padStart(4, "0")}`;
}

/**
 * Sec 5: allocates the next number atomically, through the database
 * function rather than a read-then-write in application code.
 */
export async function allocateNumber(accountId: string, series: "QUO" | "INV" | "CN", year: number) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("bizup_allocate_document_number", {
    p_account_id: accountId,
    p_series: series,
    p_year: year,
  });
  if (error) throw new Error(`Could not allocate a ${series} number: ${error.message}`);
  return formatDocumentNumber(series, year, Number(data));
}

/** Sec 9: long unguessable token for the public document link, no expiry. */
export function generatePublicToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}
