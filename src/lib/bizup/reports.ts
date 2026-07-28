import { createAdminClient } from "@/lib/supabase/admin";
import { rollingWindowStart, type BizUpSettings } from "./vat";
import { type Period } from "./period";

export { resolvePeriod, PERIOD_OPTIONS, type Period, type PeriodId } from "./period";

// BizUp/docs/bizup-phase1-spec.md Sec 12: seven reports, and the spec's own
// instruction is "resist adding more".
//
// Every figure the product reports comes from this one file. The screens,
// the CSV exports and the accountant package all call the same functions,
// so a number shown on screen and the same number in the accountant's
// spreadsheet cannot drift apart. That mattered enough to be worth the
// indirection: an accountant finding two different totals for one month is
// the fastest way to lose a member's trust in the whole product.

/** YYYY-MM-DD, matching what the date columns store. */
function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ============================================================
// Report shapes
// ============================================================

export interface QuotesReport {
  sent: number;
  accepted: number;
  totalValueCents: number;
  acceptedValueCents: number;
  /** Null rather than 0 when nothing was sent: "0% win rate" on no quotes is a lie. */
  winRatePct: number | null;
}

export interface InvoicedReport {
  count: number;
  totalInclCents: number;
  totalExclCents: number;
  vatCents: number;
}

export interface MoneyInReport {
  receivedCents: number;
  outstandingCents: number;
  outstandingCount: number;
}

export interface AgedDebtorsBucket {
  label: string;
  cents: number;
  count: number;
}

export interface PipelineReport {
  count: number;
  faceValueCents: number;
}

export interface VatTrackerReport {
  rollingTotalCents: number;
  voluntaryThresholdCents: number;
  compulsoryThresholdCents: number;
  windowFrom: string;
}

export interface ReportsBundle {
  period: Period;
  quotes: QuotesReport;
  invoiced: InvoicedReport;
  moneyIn: MoneyInReport;
  agedDebtors: AgedDebtorsBucket[];
  pipeline: PipelineReport;
  vatTracker: VatTrackerReport;
}

// Statuses that mean a document was really issued, as opposed to a draft
// or something later cancelled. Enumerated rather than "not draft", so a
// status added later is classified deliberately.
const ISSUED_INVOICE_STATUSES = ["issued", "partially_paid", "paid", "overdue", "corrected"];
const OPEN_INVOICE_STATUSES = ["issued", "partially_paid", "overdue"];

// ============================================================
// The queries
// ============================================================

export async function loadReports(
  accountId: string,
  period: Period,
  settings: BizUpSettings,
  today: string = new Date().toISOString().slice(0, 10),
): Promise<ReportsBundle> {
  const admin = createAdminClient();

  const [
    { data: quoteRows },
    { data: invoiceRows },
    { data: paymentRows },
    { data: openInvoices },
    { data: openQuotes },
    { data: turnoverRows },
  ] = await Promise.all([
    // 1. Quotes for the period. Dated on issue, because a quote drafted in
    // March and sent in April belongs to April.
    admin
      .from("bizup_documents")
      .select("id, status, total_incl_cents")
      .eq("account_id", accountId)
      .eq("doc_type", "quote")
      .not("number", "is", null)
      .gte("issue_date", period.from)
      .lte("issue_date", period.to),

    // 2. Invoiced for the period.
    admin
      .from("bizup_documents")
      .select("id, total_incl_cents, subtotal_excl_cents, vat_amount_cents")
      .eq("account_id", accountId)
      .eq("doc_type", "invoice")
      .in("status", ISSUED_INVOICE_STATUSES)
      .gte("issue_date", period.from)
      .lte("issue_date", period.to),

    // 3. Money in. Dated on the payment, not the invoice, which is the
    // whole point of the report: what actually arrived in the period.
    admin
      .from("bizup_payments")
      .select("amount_cents, paid_at, bizup_documents!inner(account_id)")
      .eq("bizup_documents.account_id", accountId)
      .gte("paid_at", period.from)
      .lte("paid_at", period.to),

    // 4. Aged debtors, and the outstanding half of money in. Deliberately
    // NOT filtered by the period: what is owed is owed as at today,
    // regardless of which month it was invoiced in.
    admin
      .from("bizup_documents")
      .select("id, total_incl_cents, due_date, issue_date")
      .eq("account_id", accountId)
      .eq("doc_type", "invoice")
      .in("status", OPEN_INVOICE_STATUSES),

    // 5. Pipeline: open quotes not yet expired, at face value. Sec 12 is
    // explicit that there is no weighting, "it will confuse people".
    admin
      .from("bizup_documents")
      .select("id, total_incl_cents, valid_until")
      .eq("account_id", accountId)
      .eq("doc_type", "quote")
      .eq("status", "sent"),

    // 6. VAT turnover: a rolling twelve months, never the selected period.
    // Sec 3.5(a): SARS tests any consecutive twelve-month window, so this
    // one ignores the period selector on purpose.
    admin
      .from("bizup_documents")
      .select("subtotal_excl_cents")
      .eq("account_id", accountId)
      .eq("doc_type", "invoice")
      .in("status", ISSUED_INVOICE_STATUSES)
      .gte("issue_date", iso(rollingWindowStart(new Date(today)))),
  ]);

  const quotes = quoteRows ?? [];
  const sent = quotes.length;
  const acceptedRows = quotes.filter((q) => q.status === "accepted" || q.status === "converted");

  const invoices = invoiceRows ?? [];

  // Payments are needed per invoice to work out what is still outstanding,
  // so they are fetched for the open invoices specifically rather than
  // reusing the period-filtered set above.
  const openIds = (openInvoices ?? []).map((i) => i.id);
  const { data: openPayments } = openIds.length
    ? await admin
        .from("bizup_payments")
        .select("document_id, amount_cents")
        .in("document_id", openIds)
    : { data: [] };

  const paidByDoc = new Map<string, number>();
  for (const p of openPayments ?? []) {
    paidByDoc.set(p.document_id, (paidByDoc.get(p.document_id) ?? 0) + p.amount_cents);
  }

  const buckets: AgedDebtorsBucket[] = [
    { label: "0 to 30 days", cents: 0, count: 0 },
    { label: "31 to 60 days", cents: 0, count: 0 },
    { label: "61 to 90 days", cents: 0, count: 0 },
    { label: "Over 90 days", cents: 0, count: 0 },
  ];

  let outstandingCents = 0;
  let outstandingCount = 0;

  for (const inv of openInvoices ?? []) {
    const owing = inv.total_incl_cents - (paidByDoc.get(inv.id) ?? 0);
    if (owing <= 0) continue;

    outstandingCents += owing;
    outstandingCount += 1;

    // Aged from the due date, which is what "aged debtors" means to an
    // accountant: how overdue, not how old. An invoice inside its payment
    // terms sits in the first bucket rather than being counted as late.
    const reference = inv.due_date ?? inv.issue_date;
    const days = reference
      ? Math.floor((Date.parse(today) - Date.parse(reference)) / 86400000)
      : 0;

    const index = days <= 30 ? 0 : days <= 60 ? 1 : days <= 90 ? 2 : 3;
    buckets[index].cents += owing;
    buckets[index].count += 1;
  }

  const pipelineRows = (openQuotes ?? []).filter(
    (q) => !q.valid_until || q.valid_until >= today,
  );

  return {
    period,
    quotes: {
      sent,
      accepted: acceptedRows.length,
      totalValueCents: quotes.reduce((s, q) => s + q.total_incl_cents, 0),
      acceptedValueCents: acceptedRows.reduce((s, q) => s + q.total_incl_cents, 0),
      winRatePct: sent === 0 ? null : Math.round((acceptedRows.length / sent) * 100),
    },
    invoiced: {
      count: invoices.length,
      totalInclCents: invoices.reduce((s, i) => s + i.total_incl_cents, 0),
      totalExclCents: invoices.reduce((s, i) => s + i.subtotal_excl_cents, 0),
      vatCents: invoices.reduce((s, i) => s + i.vat_amount_cents, 0),
    },
    moneyIn: {
      receivedCents: (paymentRows ?? []).reduce((s, p) => s + p.amount_cents, 0),
      outstandingCents,
      outstandingCount,
    },
    agedDebtors: buckets,
    pipeline: {
      count: pipelineRows.length,
      faceValueCents: pipelineRows.reduce((s, q) => s + q.total_incl_cents, 0),
    },
    vatTracker: {
      rollingTotalCents: (turnoverRows ?? []).reduce((s, r) => s + r.subtotal_excl_cents, 0),
      voluntaryThresholdCents: settings.vatVoluntaryThresholdCents,
      compulsoryThresholdCents: settings.vatCompulsoryThresholdCents,
      windowFrom: iso(rollingWindowStart(new Date(today))),
    },
  };
}

// ============================================================
// Drilling into a figure
// ============================================================

export type ReportMetric =
  | "quotes_sent"
  | "quotes_won"
  | "invoiced"
  | "received"
  | "outstanding"
  | "aged_0_30"
  | "aged_31_60"
  | "aged_61_90"
  | "aged_90_plus"
  | "pipeline";

export interface ReportDocumentRow {
  id: string;
  href: string;
  number: string | null;
  customerName: string | null;
  date: string | null;
  amountCents: number;
  note: string | null;
}

export const METRIC_TITLES: Record<ReportMetric, string> = {
  quotes_sent: "Quotes sent",
  quotes_won: "Quotes won",
  invoiced: "Invoices issued",
  received: "Payments received",
  outstanding: "Still owed to you",
  aged_0_30: "Owing, 0 to 30 days",
  aged_31_60: "Owing, 31 to 60 days",
  aged_61_90: "Owing, 61 to 90 days",
  aged_90_plus: "Owing, over 90 days",
  pipeline: "Open quotes",
};

export function isReportMetric(value: unknown): value is ReportMetric {
  return typeof value === "string" && value in METRIC_TITLES;
}

/**
 * The documents behind a figure on the reports screen.
 *
 * Deliberately built from the same filters loadReports uses rather than
 * re-queried a second way. A total and the list behind it disagreeing is
 * the fastest way to make a member stop trusting both, and two independent
 * queries drift the moment either is edited.
 */
export async function loadReportDocuments(
  accountId: string,
  period: Period,
  metric: ReportMetric,
  today: string = new Date().toISOString().slice(0, 10),
): Promise<ReportDocumentRow[]> {
  const admin = createAdminClient();

  const customerName = (r: { bizup_customers?: unknown }) =>
    (r.bizup_customers as { name?: string } | null)?.name ?? null;

  if (metric === "received") {
    const { data } = await admin
      .from("bizup_payments")
      .select(
        "id, paid_at, amount_cents, method, reference, bizup_documents!inner(id, number, account_id, bizup_customers(name))",
      )
      .eq("bizup_documents.account_id", accountId)
      .gte("paid_at", period.from)
      .lte("paid_at", period.to)
      .order("paid_at", { ascending: false });

    return (data ?? []).map((p) => {
      const doc = p.bizup_documents as unknown as {
        id: string;
        number: string | null;
        bizup_customers?: { name?: string } | null;
      };
      return {
        id: p.id,
        href: `/bizup/invoices/${doc.id}`,
        number: doc.number,
        customerName: doc.bizup_customers?.name ?? null,
        date: p.paid_at,
        amountCents: p.amount_cents,
        note: `${p.method}${p.reference ? ` · ${p.reference}` : ""}`,
      };
    });
  }

  if (metric === "quotes_sent" || metric === "quotes_won" || metric === "pipeline") {
    let query = admin
      .from("bizup_documents")
      .select("id, number, status, issue_date, valid_until, total_incl_cents, bizup_customers(name)")
      .eq("account_id", accountId)
      .eq("doc_type", "quote")
      .not("number", "is", null);

    // Pipeline is "open right now", so it is not period-scoped, exactly as
    // the tile is not.
    if (metric === "pipeline") {
      query = query.eq("status", "sent");
    } else {
      query = query.gte("issue_date", period.from).lte("issue_date", period.to);
      if (metric === "quotes_won") query = query.in("status", ["accepted", "converted"]);
    }

    const { data } = await query.order("issue_date", { ascending: false });

    return (data ?? [])
      .filter((q) => metric !== "pipeline" || !q.valid_until || q.valid_until >= today)
      .map((q) => ({
        id: q.id,
        href: `/bizup/quotes/${q.id}`,
        number: q.number,
        customerName: customerName(q),
        date: q.issue_date,
        amountCents: q.total_incl_cents,
        note:
          metric === "pipeline" && q.valid_until ? `Valid until ${q.valid_until}` : q.status,
      }));
  }

  // Everything else is invoices.
  let query = admin
    .from("bizup_documents")
    .select("id, number, status, issue_date, due_date, total_incl_cents, bizup_customers(name)")
    .eq("account_id", accountId)
    .eq("doc_type", "invoice");

  if (metric === "invoiced") {
    query = query
      .in("status", ISSUED_INVOICE_STATUSES)
      .gte("issue_date", period.from)
      .lte("issue_date", period.to);
  } else {
    // Outstanding and the aged buckets are "as at today", not period
    // scoped, matching the tiles they came from.
    query = query.in("status", OPEN_INVOICE_STATUSES);
  }

  const { data } = await query.order("due_date", { ascending: true });
  const rows = data ?? [];

  if (metric === "invoiced") {
    return rows.map((r) => ({
      id: r.id,
      href: `/bizup/invoices/${r.id}`,
      number: r.number,
      customerName: customerName(r),
      date: r.issue_date,
      amountCents: r.total_incl_cents,
      note: r.status,
    }));
  }

  // Outstanding needs payments subtracted per invoice, same as the tile.
  const ids = rows.map((r) => r.id);
  const { data: payments } = ids.length
    ? await admin.from("bizup_payments").select("document_id, amount_cents").in("document_id", ids)
    : { data: [] };

  const paidByDoc = new Map<string, number>();
  for (const p of payments ?? []) {
    paidByDoc.set(p.document_id, (paidByDoc.get(p.document_id) ?? 0) + p.amount_cents);
  }

  const bucketFor = (days: number): ReportMetric =>
    days <= 30 ? "aged_0_30" : days <= 60 ? "aged_31_60" : days <= 90 ? "aged_61_90" : "aged_90_plus";

  return rows
    .map((r) => {
      const owing = r.total_incl_cents - (paidByDoc.get(r.id) ?? 0);
      const reference = r.due_date ?? r.issue_date;
      const days = reference
        ? Math.floor((Date.parse(today) - Date.parse(reference)) / 86400000)
        : 0;
      return { row: r, owing, days };
    })
    .filter(({ owing, days }) => {
      if (owing <= 0) return false;
      if (metric === "outstanding") return true;
      return bucketFor(days) === metric;
    })
    .map(({ row, owing, days }) => ({
      id: row.id,
      href: `/bizup/invoices/${row.id}`,
      number: row.number,
      customerName: customerName(row),
      date: row.due_date,
      amountCents: owing,
      note: days > 0 ? `${days} days past due` : "Not due yet",
    }));
}

// ============================================================
// Sec 12 report 7: the client statement
// ============================================================

export interface StatementLine {
  date: string;
  kind: "invoice" | "credit_note" | "payment";
  reference: string;
  /** Positive increases what they owe, negative reduces it. */
  amountCents: number;
  runningBalanceCents: number;
}

export interface Statement {
  customer: { id: string; name: string; email: string | null; whatsapp: string | null };
  period: Period;
  lines: StatementLine[];
  closingBalanceCents: number;
}

/**
 * Sec 12: every invoice, every credit note, every payment, and the closing
 * balance.
 *
 * Sec 12 also notes statements are not financial documents in the SARS
 * sense, so they carry no number series and can be regenerated freely.
 */
export async function loadStatement(
  accountId: string,
  customerId: string,
  period: Period,
): Promise<Statement | null> {
  const admin = createAdminClient();

  const { data: customer } = await admin
    .from("bizup_customers")
    .select("id, name, email, whatsapp")
    .eq("id", customerId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (!customer) return null;

  const { data: docs } = await admin
    .from("bizup_documents")
    .select("id, doc_type, number, issue_date, total_incl_cents, status")
    .eq("account_id", accountId)
    .eq("customer_id", customerId)
    .in("doc_type", ["invoice", "credit_note"])
    .not("number", "is", null)
    .gte("issue_date", period.from)
    .lte("issue_date", period.to);

  const docIds = (docs ?? []).map((d) => d.id);
  const { data: payments } = docIds.length
    ? await admin
        .from("bizup_payments")
        .select("document_id, paid_at, amount_cents, method")
        .in("document_id", docIds)
        .gte("paid_at", period.from)
        .lte("paid_at", period.to)
    : { data: [] };

  const numberById = new Map((docs ?? []).map((d) => [d.id, d.number ?? ""]));

  const lines: Omit<StatementLine, "runningBalanceCents">[] = [
    ...(docs ?? [])
      // A cancelled invoice is not owed and must not inflate a statement
      // the customer is being asked to settle.
      .filter((d) => d.status !== "cancelled")
      .map((d) => ({
        date: d.issue_date ?? "",
        kind: (d.doc_type === "credit_note" ? "credit_note" : "invoice") as StatementLine["kind"],
        reference: d.number ?? "",
        // A credit note reduces what is owed, so it carries a negative sign
        // here even though it is stored as a positive amount.
        amountCents: d.doc_type === "credit_note" ? -d.total_incl_cents : d.total_incl_cents,
      })),
    ...(payments ?? []).map((p) => ({
      date: p.paid_at,
      kind: "payment" as const,
      reference: `${p.method.toUpperCase()} against ${numberById.get(p.document_id) ?? ""}`.trim(),
      amountCents: -p.amount_cents,
    })),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  let running = 0;
  const withBalance: StatementLine[] = lines.map((l) => {
    running += l.amountCents;
    return { ...l, runningBalanceCents: running };
  });

  return {
    customer,
    period,
    lines: withBalance,
    closingBalanceCents: running,
  };
}
