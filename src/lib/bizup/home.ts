import { createAdminClient } from "@/lib/supabase/admin";
import { getCapState, currentMonthStart, type CapState } from "./cap";
import type { BizUpPlan } from "./entitlements";

// Dewald: "the dashboard is also very confusing and empty when I am through
// the onboarding steps, no analytics dash or something that shows what this
// actually is."
//
// The three numbers below are the three questions a one-person business
// actually has, in the order they have them:
//   1. How much money is owed to me?
//   2. What is sitting with a customer waiting for an answer?
//   3. What is late and needs chasing today?
//
// Nothing else goes here. A dashboard that shows everything shows nothing,
// and this member is standing in a driveway, not studying a report.

export interface HomeSummary {
  /**
   * Money actually received this calendar month.
   *
   * Dewald asked for this in front of "owed to you", and he is right: it is
   * the number a one-person business wants first. What landed, not what is
   * still promised. Calendar month, matching the document counter, because
   * two different month boundaries on one screen would be indefensible.
   */
  incomeThisMonthCents: number;
  owedCents: number;
  owedCount: number;
  awaitingReplyCents: number;
  awaitingReplyCount: number;
  overdueCents: number;
  overdueCount: number;
  cap: CapState;
  recent: {
    id: string;
    href: string;
    number: string | null;
    docType: string;
    status: string;
    totalCents: number;
    customerName: string | null;
    firstViewedAt: string | null;
  }[];
  /**
   * Carried from here so components never read the clock themselves, which
   * React treats as impure even in a Server Component.
   */
  today: string;
  nowMs: number;
  /**
   * Whether this member has ever issued a single document.
   *
   * Drives which home screen they get. Someone who has never sent anything
   * was being shown three cards reading R0.00 and a used-documents counter
   * at zero, which is four pieces of nothing and no instruction. They get a
   * screen with one thing on it instead.
   *
   * Deliberately "ever", not "this month": a plumber returning in a quiet
   * February does not need to be taught the product again.
   */
  hasEverIssued: boolean;
  /**
   * The overdue invoices themselves, not just the total.
   *
   * Telling a member they are owed R14,000 and giving them nothing to do
   * about it is the gap this closes. Chasing money is the job, so the list
   * belongs on the screen where the job actually gets done.
   */
  overdue: {
    id: string;
    number: string | null;
    customerName: string | null;
    outstandingCents: number;
    dueDate: string | null;
    lastRemindedAt: string | null;
  }[];
}

export async function getHomeSummary(
  accountId: string,
  plan: BizUpPlan,
  topupBalance: number,
): Promise<HomeSummary> {
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: invoices },
    { data: quotes },
    { data: payments },
    { data: recentRows },
    cap,
    { count: issuedEver },
  ] = await Promise.all([
      admin
        .from("bizup_documents")
        .select("id, number, total_incl_cents, status, due_date, last_reminded_at, bizup_customers(name)")
        .eq("account_id", accountId)
        .eq("doc_type", "invoice")
        .in("status", ["issued", "partially_paid"]),
      admin
        .from("bizup_documents")
        .select("id, total_incl_cents")
        .eq("account_id", accountId)
        .eq("doc_type", "quote")
        .eq("status", "sent"),
      admin
        .from("bizup_payments")
        .select("amount_cents, document_id, paid_at, bizup_documents!inner(account_id)")
        .eq("bizup_documents.account_id", accountId),
      // Only what is still open. Dewald: "once a quote is approved or
      // declined, and an invoice marked paid, it moves out of the recent
      // docs." A finished document is not work, and leaving it here buries
      // the things that still need an answer under the things that do not.
      // Everything, finished or not, remains in the full Quotes and
      // Invoices sections.
      admin
        .from("bizup_documents")
        .select("id, number, doc_type, status, total_incl_cents, first_viewed_at, bizup_customers(name)")
        .eq("account_id", accountId)
        .in("status", ["draft", "sent", "issued", "partially_paid", "overdue"])
        .order("created_at", { ascending: false })
        .limit(8),
      getCapState(accountId, plan, topupBalance),
      // head:true so this is a count, not a row fetch. A member with two
      // years of history should not pull all of it to answer one boolean.
      admin
        .from("bizup_documents")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .not("number", "is", null),
    ]);

  // Payments are subtracted per invoice rather than in aggregate, so a
  // part-paid invoice contributes only what is still outstanding. Summing
  // totals and then subtracting all payments would give the same figure
  // here, but breaks the moment a payment exists against a cancelled or
  // credited invoice.
  const paidByDoc = new Map<string, number>();
  for (const p of payments ?? []) {
    paidByDoc.set(p.document_id, (paidByDoc.get(p.document_id) ?? 0) + p.amount_cents);
  }

  let owedCents = 0;
  let owedCount = 0;
  let overdueCents = 0;
  let overdueCount = 0;
  const overdue: HomeSummary["overdue"] = [];

  for (const inv of invoices ?? []) {
    const outstanding = inv.total_incl_cents - (paidByDoc.get(inv.id) ?? 0);
    if (outstanding <= 0) continue;
    owedCents += outstanding;
    owedCount += 1;
    // Overdue is derived from the due date rather than stored, so it is
    // always right without a nightly job keeping it right.
    if (inv.due_date && inv.due_date < today) {
      overdueCents += outstanding;
      overdueCount += 1;
      overdue.push({
        id: inv.id,
        number: inv.number,
        customerName: (inv.bizup_customers as unknown as { name?: string } | null)?.name ?? null,
        outstandingCents: outstanding,
        dueDate: inv.due_date,
        lastRemindedAt: inv.last_reminded_at,
      });
    }
  }

  const awaitingReplyCents = (quotes ?? []).reduce((s, q) => s + q.total_incl_cents, 0);

  const monthStart = currentMonthStart().toISOString().slice(0, 10);
  const incomeThisMonthCents = (payments ?? [])
    .filter((p) => String(p.paid_at) >= monthStart)
    .reduce((s, p) => s + p.amount_cents, 0);

  return {
    incomeThisMonthCents,
    owedCents,
    owedCount,
    awaitingReplyCents,
    awaitingReplyCount: (quotes ?? []).length,
    overdueCents,
    overdueCount,
    today,
    nowMs: Date.now(),
    hasEverIssued: (issuedEver ?? 0) > 0,
    // Worst first: the one that has been owing longest is the one to phone
    // about, and a member scanning this list will act on the top item.
    overdue: overdue.sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "")),
    cap,
    recent: (recentRows ?? []).map((r) => ({
      id: r.id,
      href: `/bizup/${r.doc_type === "quote" ? "quotes" : "invoices"}/${r.id}`,
      number: r.number,
      docType: r.doc_type,
      status: r.status,
      totalCents: r.total_incl_cents,
      customerName: (r.bizup_customers as unknown as { name: string } | null)?.name ?? null,
      firstViewedAt: r.first_viewed_at,
    })),
  };
}
