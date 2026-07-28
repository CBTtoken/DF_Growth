import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { loadSettings } from "@/lib/bizup/documents";
import { capabilitiesFor, type BizUpPlan } from "@/lib/bizup/entitlements";
import { loadReports, resolvePeriod } from "@/lib/bizup/reports";
import { toCsv, csvAmount, csvResponse } from "@/lib/bizup/csv";
import { bizupLoginPath } from "@/lib/bizup/product";

// Sec 12: "Every report exportable to CSV and PDF."
//
// One file with every figure on the reports screen, rather than one
// download per report. A member wanting last month's numbers wants the
// numbers, not six separate files to reconcile by hand.
export async function GET(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(await bizupLoginPath());

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("bizup_accounts")
    .select("id, business_name, plan, financial_year_end_month, vat_number")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  // 404 rather than 403, so the endpoint never confirms what exists.
  if (!account) return new Response("Not found", { status: 404 });
  if (!capabilitiesFor(account.plan as BizUpPlan).reports) {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const period = resolvePeriod(
    url.searchParams.get("period") ?? undefined,
    account.financial_year_end_month,
    { from: url.searchParams.get("from") ?? undefined, to: url.searchParams.get("to") ?? undefined },
  );

  const settings = await loadSettings();
  const r = await loadReports(account.id, period, settings);

  // Long format, one metric per row. An accountant filters and pivots this;
  // a wide single-row layout would be unreadable the moment a second period
  // is pasted underneath it.
  const rows: unknown[][] = [
    ["Period", period.label, ""],
    ["From", period.from, ""],
    ["To", period.to, ""],
    ["", "", ""],
    ["Quotes sent", r.quotes.sent, ""],
    ["Quotes accepted", r.quotes.accepted, ""],
    ["Quote win rate %", r.quotes.winRatePct ?? "", "Blank when no quotes were sent"],
    ["Quotes value sent", csvAmount(r.quotes.totalValueCents), "Incl VAT"],
    ["Quotes value won", csvAmount(r.quotes.acceptedValueCents), "Incl VAT"],
    ["", "", ""],
    ["Invoices issued", r.invoiced.count, ""],
    ["Invoiced total", csvAmount(r.invoiced.totalInclCents), "Incl VAT"],
    ["Invoiced excluding VAT", csvAmount(r.invoiced.totalExclCents), ""],
    ["VAT charged", csvAmount(r.invoiced.vatCents), ""],
    ["", "", ""],
    ["Payments received in period", csvAmount(r.moneyIn.receivedCents), ""],
    ["Outstanding as at today", csvAmount(r.moneyIn.outstandingCents), `${r.moneyIn.outstandingCount} invoices`],
    ["", "", ""],
    ...r.agedDebtors.map((b) => [`Aged debtors, ${b.label}`, csvAmount(b.cents), `${b.count} invoices`]),
    ["", "", ""],
    ["Open quotes", r.pipeline.count, "Sent, not expired"],
    ["Open quotes face value", csvAmount(r.pipeline.faceValueCents), "No weighting applied"],
    ["", "", ""],
    ["VAT rolling 12 month turnover", csvAmount(r.vatTracker.rollingTotalCents), `Since ${r.vatTracker.windowFrom}, excluding VAT`],
    ["VAT voluntary threshold", csvAmount(r.vatTracker.voluntaryThresholdCents), ""],
    ["VAT compulsory threshold", csvAmount(r.vatTracker.compulsoryThresholdCents), ""],
  ];

  const csv = toCsv(["Measure", "Value", "Note"], rows);
  const safeName = account.business_name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  return csvResponse(`${safeName}-report-${period.from}-to-${period.to}.csv`, csv);
}
