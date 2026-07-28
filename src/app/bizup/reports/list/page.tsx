import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { bizupLoginPath } from "@/lib/bizup/product";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { capabilitiesFor, type BizUpPlan } from "@/lib/bizup/entitlements";
import {
  loadReportDocuments,
  isReportMetric,
  METRIC_TITLES,
  resolvePeriod,
} from "@/lib/bizup/reports";
import { formatZar } from "@/lib/bizup/money";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Dewald: "can we make the analytics clickable so they can see which
// invoices are outstanding and so forth?"
//
// Every figure on the reports screen now leads here, to the documents
// behind it. The rows come from the same module the totals do, so a total
// and its list cannot disagree, which is the failure that would make a
// member stop trusting both.

export default async function ReportDrilldownPage({
  searchParams,
}: {
  searchParams: Promise<{ metric?: string; period?: string; from?: string; to?: string }>;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(await bizupLoginPath());

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("bizup_accounts")
    .select("id, plan, financial_year_end_month")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!account) redirect("/bizup/start");
  if (!capabilitiesFor(account.plan as BizUpPlan).reports) redirect("/bizup/upgrade");

  const params = await searchParams;
  if (!isReportMetric(params.metric)) notFound();

  const period = resolvePeriod(params.period, account.financial_year_end_month, {
    from: params.from,
    to: params.to,
  });

  const rows = await loadReportDocuments(account.id, period, params.metric);
  const total = rows.reduce((s, r) => s + r.amountCents, 0);

  // The figures that are "as at today" rather than period scoped, matching
  // how the tiles on the reports screen behave. Saying so here stops a
  // member wondering why changing the period did not change the list.
  const asAtToday = ["outstanding", "aged_0_30", "aged_31_60", "aged_61_90", "aged_90_plus", "pipeline"].includes(
    params.metric,
  );

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 p-6">
        <Link
          href={`/bizup/reports?period=${period.id}&from=${period.from}&to=${period.to}`}
          className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-brand hover:underline"
        >
          Back to reports
        </Link>

        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            {METRIC_TITLES[params.metric]}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {asAtToday ? "As things stand today" : period.label} · {rows.length}{" "}
            {rows.length === 1 ? "document" : "documents"} · {formatZar(total)}
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500">
            Nothing here for this period.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((r) => (
              <Link
                key={r.id}
                href={r.href}
                className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-brand"
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-ink">
                    {r.customerName ?? "No customer"}
                  </span>
                  <span className="block truncate text-sm text-gray-500">
                    {r.number ?? "No number"}
                    {r.date ? ` · ${r.date}` : ""}
                    {r.note ? ` · ${r.note}` : ""}
                  </span>
                </span>
                <span className="shrink-0 font-semibold text-ink">{formatZar(r.amountCents)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
