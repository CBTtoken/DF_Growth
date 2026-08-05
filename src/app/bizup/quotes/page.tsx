import type { Metadata } from "next";
import { bizupLoginPath } from "@/lib/bizup/product";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/bizup/documents";
import { createAdminClient } from "@/lib/supabase/admin";
import { createQuote } from "@/app/bizup/quotes/actions";
import { formatZar } from "@/lib/bizup/money";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  converted: "Invoiced",
};

/**
 * Walkthrough finding, 5 Aug 2026 (Dewald's "housekeeping on old open
 * ones" journey): the list said Sent but never how long ago, so an open
 * quote from three weeks back looked identical to one from this morning.
 * Age is what tells a member which ones need the follow-up call.
 */
function quoteAge(createdAt: string, validUntil: string | null): { text: string; urgent: boolean } {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
  const age = days <= 0 ? "sent today" : days === 1 ? "sent yesterday" : `sent ${days} days ago`;
  if (validUntil) {
    const left = Math.ceil((new Date(validUntil).getTime() - Date.now()) / 86_400_000);
    if (left < 0) return { text: `${age} • past its valid-until date`, urgent: true };
    if (left <= 7) return { text: `${age} • expires in ${left <= 1 ? "a day" : `${left} days`}`, urgent: true };
  }
  return { text: age, urgent: days >= 14 };
}

export default async function BizUpQuotesPage() {
  const account = await currentAccount();
  if (!account) redirect(await bizupLoginPath());

  const admin = createAdminClient();
  const { data: quotes, error } = await admin
    .from("bizup_documents")
    .select("id, number, status, total_incl_cents, created_at, valid_until, first_viewed_at, customer_id, bizup_customers(name)")
    .eq("account_id", account.id)
    .eq("doc_type", "quote")
    .order("created_at", { ascending: false });

  // Checked rather than assumed, so a broken query never renders as
  // "you have no quotes".
  if (error) console.error("KatisoBiz quote list failed", error);
  const rows = quotes ?? [];

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 p-6">
        <Link href="/bizup" className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-brand hover:underline">
          Back to KatisoBiz
        </Link>

        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold tracking-tight text-ink">Quotes</h1>
          <form action={createQuote}>
            <button
              type="submit"
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
            >
              New quote
            </button>
          </form>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-500">
              No quotes yet. Start one and add lines as you walk the job.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((q) => {
              const customer = q.bizup_customers as unknown as { name: string } | null;
              return (
                <li key={q.id}>
                  <Link
                    href={`/bizup/quotes/${q.id}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-brand"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-semibold text-ink">
                        {q.number ?? "Draft"}
                        {customer ? ` • ${customer.name}` : ""}
                      </span>
                      <span className="text-sm text-gray-500">
                        {STATUS_LABEL[q.status] ?? q.status}
                        {/* Dewald's addition: show the member that their
                            customer actually opened the quote. */}
                        {q.first_viewed_at ? " • Opened by customer" : ""}
                      </span>
                      {q.status === "sent" &&
                        (() => {
                          const age = quoteAge(q.created_at, q.valid_until);
                          return (
                            <span className={`text-xs ${age.urgent ? "font-medium text-amber-700" : "text-gray-400"}`}>
                              {age.text}
                            </span>
                          );
                        })()}
                    </span>
                    <span className="shrink-0 font-semibold text-ink">
                      {formatZar(q.total_incl_cents)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
