import type { Metadata } from "next";
import { bizupLoginPath } from "@/lib/bizup/product";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/bizup/documents";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatZar } from "@/lib/bizup/money";
import { ilikeAcross } from "@/lib/bizup/search";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Dewald: "History tab with closed documents, searchable, date-wise,
// separate tabs for Quotes and Invoices."
//
// The Quotes and Invoices screens list everything, newest first, which is
// the right shape for work in progress and the wrong shape for looking
// something up six months later. This is the second half: only documents
// that are finished with, searchable, and split by kind because a member
// looking for last March's invoice is not also looking at quotes.

// Deliberately enumerated rather than derived as "not open". A status added
// later should not silently start appearing in history because it failed to
// match a negative list; it should be classified on purpose.
const CLOSED_QUOTE_STATUSES = ["accepted", "declined", "expired", "converted"];
const CLOSED_INVOICE_STATUSES = ["paid", "cancelled", "credited", "superseded", "corrected"];

const STATUS_LABEL: Record<string, string> = {
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  converted: "Invoiced",
  paid: "Paid",
  cancelled: "Cancelled",
  credited: "Credited",
  superseded: "Replaced",
  corrected: "Corrected",
};

const STATUS_TONE: Record<string, string> = {
  accepted: "bg-green-50 text-green-800",
  paid: "bg-green-50 text-green-800",
  declined: "bg-red-50 text-red-700",
  cancelled: "bg-red-50 text-red-700",
  credited: "bg-red-50 text-red-700",
};

export default async function BizUpHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const account = await currentAccount();
  if (!account) redirect(await bizupLoginPath());

  const params = await searchParams;
  const tab = params.tab === "invoices" ? "invoices" : "quotes";
  const term = (params.q ?? "").trim();

  const admin = createAdminClient();

  // A member searches by whatever they remember, which is the customer's
  // name at least as often as the document number. PostgREST cannot OR a
  // filter on an embedded resource together with one on the parent, so the
  // customer names are resolved to ids first and folded into a single
  // filter. Doing it this way keeps the search on the database rather than
  // filtering a truncated page in the browser, which would quietly miss
  // older matches.
  let matchingCustomerIds: string[] = [];
  if (term) {
    const nameFilter = ilikeAcross(["name"], term);
    if (nameFilter) {
      const { data: matched } = await admin
        .from("bizup_customers")
        .select("id")
        .eq("account_id", account.id)
        .or(nameFilter)
        .limit(50);
      matchingCustomerIds = (matched ?? []).map((c) => c.id);
    }
  }

  let query = admin
    .from("bizup_documents")
    .select("id, number, status, total_incl_cents, issue_date, created_at, bizup_customers(name)")
    .eq("account_id", account.id)
    .eq("doc_type", tab === "invoices" ? "invoice" : "quote")
    .in("status", tab === "invoices" ? CLOSED_INVOICE_STATUSES : CLOSED_QUOTE_STATUSES);

  if (term) {
    const clauses = [ilikeAcross(["number"], term)].filter(Boolean) as string[];
    if (matchingCustomerIds.length > 0) {
      clauses.push(`customer_id.in.(${matchingCustomerIds.join(",")})`);
    }
    query = query.or(clauses.join(","));
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(200);

  // Checked rather than assumed, so a failed query never renders as "you
  // have no history".
  if (error) console.error("KatisoBiz history query failed", error);

  const customerName = (row: { bizup_customers?: unknown }) =>
    (row.bizup_customers as { name?: string } | null)?.name ?? "";

  const rows = data ?? [];

  const tabClass = (active: boolean) =>
    `rounded-full px-5 py-2.5 text-sm font-bold transition ${
      active ? "bg-brand text-white" : "border border-gray-200 bg-white text-gray-700 hover:border-brand"
    }`;

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 p-6">
        <Link
          href="/bizup"
          className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-brand hover:underline"
        >
          Back to KatisoBiz
        </Link>

        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">History</h1>
          <p className="mt-1 text-sm text-gray-500">
            Everything you have finished with. Anything still open stays on your Quotes and
            Invoices screens.
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/bizup/history?tab=quotes" className={tabClass(tab === "quotes")}>
            Quotes
          </Link>
          <Link href="/bizup/history?tab=invoices" className={tabClass(tab === "invoices")}>
            Invoices
          </Link>
        </div>

        {/* A plain GET form, so a search can be bookmarked, shared and
            reloaded, and so it works with no JavaScript at all. */}
        <form method="get" className="flex gap-2">
          <input type="hidden" name="tab" value={tab} />
          <input
            name="q"
            defaultValue={term}
            placeholder="Search by number or name"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            aria-label="Search your history"
          />
          <button
            type="submit"
            className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
          >
            Search
          </button>
        </form>

        {term && (
          <p className="text-sm text-gray-500">
            {rows.length === 0 ? "Nothing matches" : `${rows.length} found`} for &quot;{term}&quot;.{" "}
            <Link
              href={`/bizup/history?tab=${tab}`}
              className="font-semibold text-brand underline-offset-2 hover:underline"
            >
              Clear
            </Link>
          </p>
        )}

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-500">
              {term
                ? "Nothing here matches that search."
                : tab === "invoices"
                  ? "No finished invoices yet. Invoices appear here once they are paid or cancelled."
                  : "No finished quotes yet. Quotes appear here once they are accepted, declined or invoiced."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((row) => (
              <Link
                key={row.id}
                href={`/bizup/${tab === "invoices" ? "invoices" : "quotes"}/${row.id}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-brand"
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-ink">
                    {row.number ?? "No number"}
                  </span>
                  <span className="block truncate text-sm text-gray-500">
                    {customerName(row) || "No customer"}
                    {row.issue_date ? ` · ${row.issue_date}` : ""}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-semibold text-ink">{formatZar(row.total_incl_cents)}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      STATUS_TONE[row.status] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {STATUS_LABEL[row.status] ?? row.status}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
