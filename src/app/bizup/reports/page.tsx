import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { bizupLoginPath } from "@/lib/bizup/product";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { loadSettings } from "@/lib/bizup/documents";
import { capabilitiesFor, type BizUpPlan } from "@/lib/bizup/entitlements";
import { loadReports, resolvePeriod, PERIOD_OPTIONS } from "@/lib/bizup/reports";
import { formatZar } from "@/lib/bizup/money";
import { vatTrackerState } from "@/lib/bizup/vat";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Spec Sec 12: seven reports, and its own instruction is "resist adding
// more". Six live on this page; the seventh, the client statement, is per
// customer and has its own screen.
//
// Every figure comes from lib/bizup/reports.ts, the same functions the CSV
// and the accountant package use, so what a member reads here and what
// their accountant opens in Excel cannot disagree.

function Tile({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string | null;
  /**
   * Dewald: "can we make the analytics clickable so they can see which
   * invoices are outstanding and so forth?" Given a href, the tile leads
   * to the documents behind the figure.
   */
  href?: string;
}) {
  const body = (
    <>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </>
  );

  // A figure with no list behind it stays a plain box rather than becoming
  // a link to an empty page.
  if (!href) {
    return <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">{body}</div>;
  }

  return (
    <Link
      href={href}
      className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-brand"
    >
      {body}
    </Link>
  );
}

export default async function BizUpReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(await bizupLoginPath());

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("bizup_accounts")
    .select("id, plan, financial_year_end_month, vat_number")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!account) redirect("/bizup/start");

  const capabilities = capabilitiesFor(account.plan as BizUpPlan);
  const params = await searchParams;

  // Reports are an R49 feature and are sold as one. Shown as a locked
  // screen rather than hidden, so the upgrade has something concrete
  // attached to it.
  if (!capabilities.reports) {
    return (
      <main className="flex flex-1 flex-col bg-gray-50">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 p-6">
          <Link href="/bizup" className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-brand hover:underline">
            Back to KatisoBiz
          </Link>
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-bold tracking-tight text-ink">Reports</h1>
            <p className="mt-2 text-sm text-gray-600">
              Reports come with the R49 plan. They show what you quoted and won, what you invoiced,
              what has actually been paid, who is behind, and how close you are to needing to
              register for VAT.
            </p>
            <Link
              href="/bizup/upgrade"
              className="mt-5 inline-block rounded-full bg-brand px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark"
            >
              See the plans
            </Link>
          </div>
        </div>
        <SiteFooter />
      </main>
    );
  }

  const settings = await loadSettings();
  const period = resolvePeriod(params.period, account.financial_year_end_month, {
    from: params.from,
    to: params.to,
  });
  const r = await loadReports(account.id, period, settings);

  const vendor = !!account.vat_number;
  const tracker = vatTrackerState(r.vatTracker.rollingTotalCents, settings);

  const drill = (metric: string) => `/bizup/reports/list?metric=${metric}&period=${period.id}&from=${period.from}&to=${period.to}`;

  const qs = (id: string) => `/bizup/reports?period=${id}`;
  const exportQs = `period=${period.id}&from=${period.from}&to=${period.to}`;

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 p-6">
        <Link href="/bizup" className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-brand hover:underline">
          Back to KatisoBiz
        </Link>

        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Reports</h1>
          <p className="mt-1 text-sm text-gray-500">{period.label}</p>
        </div>

        {/* Period selector. A plain set of links, so a chosen period is in
            the URL and can be bookmarked, shared and reloaded. */}
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.filter((o) => o.id !== "custom").map((o) => (
            <Link
              key={o.id}
              href={qs(o.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                period.id === o.id
                  ? "bg-brand text-white"
                  : "border border-gray-200 bg-white text-gray-700 hover:border-brand"
              }`}
            >
              {o.label}
            </Link>
          ))}
        </div>

        <form method="get" className="flex flex-wrap items-end gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <input type="hidden" name="period" value="custom" />
          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            From
            <input type="date" name="from" defaultValue={period.from} className="rounded-xl border border-gray-200 px-3 py-2 text-base" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            To
            <input type="date" name="to" defaultValue={period.to} className="rounded-xl border border-gray-200 px-3 py-2 text-base" />
          </label>
          <button type="submit" className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-brand hover:text-brand">
            Show
          </button>
        </form>

        {/* 1. Quotes */}
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-ink">Quotes</h2>
          <div className="grid grid-cols-2 gap-3">
            <Tile label="Sent" value={String(r.quotes.sent)} href={drill("quotes_sent")} />
            <Tile
              label="Won"
              value={r.quotes.winRatePct === null ? "No quotes yet" : `${r.quotes.winRatePct}%`}
              hint={`${r.quotes.accepted} of ${r.quotes.sent}`}
              href={drill("quotes_won")}
            />
            <Tile label="Value sent" value={formatZar(r.quotes.totalValueCents)} href={drill("quotes_sent")} />
            <Tile label="Value won" value={formatZar(r.quotes.acceptedValueCents)} href={drill("quotes_won")} />
          </div>
        </section>

        {/* 2. Invoiced */}
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-ink">Invoiced</h2>
          <div className="grid grid-cols-2 gap-3">
            <Tile label="Invoices issued" value={String(r.invoiced.count)} href={drill("invoiced")} />
            <Tile label="Total invoiced" value={formatZar(r.invoiced.totalInclCents)} href={drill("invoiced")} />
            {vendor && <Tile label="Excluding VAT" value={formatZar(r.invoiced.totalExclCents)} />}
            {vendor && <Tile label="VAT charged" value={formatZar(r.invoiced.vatCents)} />}
          </div>
        </section>

        {/* 3. Money in */}
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-ink">Money in</h2>
          <div className="grid grid-cols-2 gap-3">
            <Tile label="Received this period" value={formatZar(r.moneyIn.receivedCents)} href={drill("received")} />
            <Tile
              label="Still owed to you"
              value={formatZar(r.moneyIn.outstandingCents)}
              hint={`${r.moneyIn.outstandingCount} unpaid ${r.moneyIn.outstandingCount === 1 ? "invoice" : "invoices"}, as at today`}
              href={drill("outstanding")}
            />
          </div>
        </section>

        {/* 4. Aged debtors */}
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-ink">Who is behind</h2>
          <p className="text-xs text-gray-500">
            Counted from the due date, so an invoice still inside its payment terms is not treated
            as late.
          </p>
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            {/* Each bucket opens the invoices inside it. This is the one
                Dewald specifically asked for: seeing R14,000 over 90 days
                is only useful if the next tap tells you whose it is. */}
            {r.agedDebtors.map((b, i) => {
              const metric = ["aged_0_30", "aged_31_60", "aged_61_90", "aged_90_plus"][i];
              return (
                <Link
                  key={b.label}
                  href={drill(metric)}
                  className={`flex items-center justify-between gap-3 px-4 py-3 text-sm transition hover:bg-gray-50 ${i > 0 ? "border-t border-gray-100" : ""}`}
                >
                  <span className="text-gray-600">
                    {b.label}
                    {b.count > 0 && <span className="ml-2 text-xs text-gray-400">{b.count}</span>}
                  </span>
                  <span className={`font-semibold ${i === 3 && b.cents > 0 ? "text-red-700" : "text-ink"}`}>
                    {formatZar(b.cents)}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 5. Pipeline */}
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-ink">Still out there</h2>
          <div className="grid grid-cols-2 gap-3">
            <Tile label="Open quotes" value={String(r.pipeline.count)} hint="Sent, not yet expired" href={drill("pipeline")} />
            <Tile label="At face value" value={formatZar(r.pipeline.faceValueCents)} href={drill("pipeline")} />
          </div>
        </section>

        {/* 6. VAT turnover tracker. Sec 3.5(a): a rolling twelve months, so
            it deliberately ignores the period selector above. */}
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-ink">VAT turnover</h2>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">
              Your last twelve months of sales, excluding VAT. This always covers twelve months,
              whatever period you picked above, because that is how SARS measures it.
            </p>
            <p className="mt-2 text-xl font-bold tracking-tight text-ink">
              {formatZar(r.vatTracker.rollingTotalCents)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Since {r.vatTracker.windowFrom}. You may register voluntarily above{" "}
              {formatZar(r.vatTracker.voluntaryThresholdCents)}, and must register above{" "}
              {formatZar(r.vatTracker.compulsoryThresholdCents)}.
            </p>
            {tracker.message && (
              <p
                className={`mt-3 rounded-xl p-3 text-sm font-medium ${
                  tracker.marker === "compulsory"
                    ? "bg-red-50 text-red-800"
                    : "bg-amber-50 text-amber-900"
                }`}
              >
                {tracker.message}
              </p>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Take it with you</h2>
          <div className="flex flex-wrap gap-3">
            <a
              href={`/bizup/reports/csv?${exportQs}`}
              className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-brand hover:text-brand"
            >
              Download as CSV
            </a>
            <Link
              href={`/bizup/reports/statement?${exportQs}`}
              className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-brand hover:text-brand"
            >
              Customer statement
            </Link>
            {capabilities.accountantExport && (
              <Link
                href={`/bizup/reports/accountant?${exportQs}`}
                className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
              >
                Export for my accountant
              </Link>
            )}
          </div>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
