import { createAdminClient } from "@/lib/supabase/admin";
import {
  allocateNumber,
  buildBankSnapshot,
  buildCustomerSnapshot,
  buildIssuerSnapshot,
  generatePublicToken,
  loadBankForDocument,
  recalcDocumentTotals,
  type BizUpAccountRow,
} from "@/lib/bizup/documents";
import { isVatVendor } from "@/lib/bizup/vat";
import { longDate } from "@/lib/stays/money";

// The balance, tracked where balances already live.
//
// Handoff Job 4: "The balance is tracked in KatisoBiz, using the existing
// part-payment and balance-owing mechanism, which already works and must
// not be rebuilt." So a confirmed booking becomes an ordinary KatisoBiz
// invoice for the full amount, with the deposit recorded against it as an
// ordinary part payment. That leaves the invoice sitting at
// 'partially_paid' with a real balance owing, which is exactly the state
// the existing reminder, the existing statement, the existing ageing report
// and the existing review request all already understand.
//
// Nothing new is built here and nothing is sent. The member presses send on
// the reminder themselves, in KatisoBiz, the way they already do.
//
// Two things make this best-effort rather than required:
//
//   1. Most Growth members have no KatisoBiz account at all. Mila's Place
//      does not, as of this sprint. A booking must complete perfectly
//      without one, so a missing account is a skip and never an error.
//   2. A failure here must never lose a booking that has already been paid
//      for. The booking is the record; the invoice is bookkeeping on top.

const ACCOUNT_COLUMNS =
  "id, business_name, trading_name, vat_number, address_line1, address_line2, city, province, postal_code, email, phone, whatsapp, template_id, bank_notice_style, insurance_pricing_enabled, logo_path";

/** The member's KatisoBiz account, or null when they have not got one. */
async function katisoBizAccount(growthClientId: string): Promise<BizUpAccountRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bizup_accounts")
    .select(ACCOUNT_COLUMNS)
    .eq("growth_client_id", growthClientId)
    .maybeSingle();
  return (data as BizUpAccountRow | null) ?? null;
}

/**
 * Finds or creates the guest as a KatisoBiz customer.
 *
 * Keyed on email when there is one, so a repeat guest is one customer with
 * one history rather than a new row every visit. With no email there is
 * nothing to recognise them by, so a new row is correct.
 */
async function guestCustomerId(
  accountId: string,
  guest: { name: string; email: string | null; phone: string | null }
): Promise<string | null> {
  const admin = createAdminClient();

  if (guest.email) {
    const { data: existing } = await admin
      .from("bizup_customers")
      .select("id")
      .eq("account_id", accountId)
      .ilike("email", guest.email)
      .maybeSingle();
    if (existing) return existing.id;
  }

  const { data: created, error } = await admin
    .from("bizup_customers")
    .insert({
      account_id: accountId,
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      is_business: false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Could not create a KatisoBiz customer for a guest", error);
    return null;
  }
  return created.id;
}

export type BalanceInvoice = { documentId: string; number: string } | null;

/**
 * Raises the invoice for a booking and records the deposit against it.
 *
 * Returns null, without complaint, whenever the member has no KatisoBiz
 * account. That is the common case today and it is not a failure: the
 * booking's own balance is still shown in the Stays and Tours dashboard
 * either way.
 */
export async function raiseBalanceInvoice(options: {
  growthClientId: string;
  guest: { name: string; email: string | null; phone: string | null };
  /** One line per thing sold, already priced. */
  lines: { description: string; quantity: number; unit: string; unitPriceExclCents: number }[];
  depositCents: number;
  /** Days after today the balance falls due, from the member's own setting. */
  balanceDueDays: number;
  reference: string;
}): Promise<BalanceInvoice> {
  const account = await katisoBizAccount(options.growthClientId);
  if (!account) return null;

  const admin = createAdminClient();

  try {
    const customerId = await guestCustomerId(account.id, options.guest);
    const { data: customer } = customerId
      ? await admin
          .from("bizup_customers")
          .select(
            "id, name, is_business, vat_number, email, phone, whatsapp, address_line1, address_line2, city, province, postal_code"
          )
          .eq("id", customerId)
          .maybeSingle()
      : { data: null };

    const today = new Date();
    const year = today.getFullYear();
    const number = await allocateNumber(account.id, "INV", year);
    const bank = await loadBankForDocument(account.id);
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + options.balanceDueDays);

    const { data: document, error: documentError } = await admin
      .from("bizup_documents")
      .insert({
        account_id: account.id,
        doc_type: "invoice",
        series: "INV",
        number,
        status: "issued",
        customer_id: customerId,
        customer_snapshot: buildCustomerSnapshot(customer ?? null),
        issuer_snapshot: buildIssuerSnapshot(account),
        bank_snapshot: buildBankSnapshot(bank, account.bank_notice_style, account.phone),
        issue_date: today.toISOString().slice(0, 10),
        due_date: dueDate.toISOString().slice(0, 10),
        template_id: account.template_id,
        public_token: generatePublicToken(),
        notes: `Booking reference ${options.reference}.`,
      })
      .select("id")
      .single();

    if (documentError || !document) {
      console.error("Could not raise a KatisoBiz invoice for a booking", documentError);
      return null;
    }

    await admin.from("bizup_document_lines").insert(
      options.lines.map((line, index) => ({
        document_id: document.id,
        line_no: index + 1,
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
        unit_price_excl_cents: line.unitPriceExclCents,
        line_total_excl_cents: Math.round(line.quantity * line.unitPriceExclCents),
      }))
    );

    // Totals are never computed here. The one function that owns them
    // computes them, the same one the builder, the PDF and every report
    // read, so a booking's invoice can never total differently from an
    // invoice typed by hand.
    await recalcDocumentTotals(document.id, isVatVendor(account.vat_number));

    if (options.depositCents > 0) {
      await admin.from("bizup_payments").insert({
        document_id: document.id,
        amount_cents: options.depositCents,
        paid_at: today.toISOString().slice(0, 10),
        method: "card",
        reference: options.reference,
        note: "Deposit paid online at booking",
      });

      // 'partially_paid' is the existing status the existing balance-owing
      // machinery keys on. Set explicitly rather than inferred, because a
      // deposit that covers the whole amount is 'paid' and neither state
      // should depend on a reader adding the payments up correctly.
      const { data: totals } = await admin
        .from("bizup_documents")
        .select("total_incl_cents")
        .eq("id", document.id)
        .single();

      const settled = (totals?.total_incl_cents ?? 0) <= options.depositCents;
      await admin
        .from("bizup_documents")
        .update({ status: settled ? "paid" : "partially_paid" })
        .eq("id", document.id);
    }

    return { documentId: document.id, number };
  } catch (err) {
    // Bookkeeping must never cost a booking. Logged loudly, and the guest
    // never sees it, because from where they stand nothing went wrong.
    console.error("Raising the KatisoBiz balance invoice threw", err);
    return null;
  }
}

/** "3 nights, 12 to 15 September 2026" for an invoice line. */
export function stayLineDescription(
  roomName: string,
  checkIn: string,
  checkOut: string,
  nights: number
): string {
  return `${roomName}, ${nights} ${nights === 1 ? "night" : "nights"}, ${longDate(checkIn)} to ${longDate(checkOut)}`;
}
