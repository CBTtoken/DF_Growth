import type { Metadata } from "next";
import { bizupLoginPath } from "@/lib/bizup/product";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/bizup/documents";
import { createAdminClient } from "@/lib/supabase/admin";
import { createInvoice } from "@/app/bizup/invoices/actions";
import { formatZar } from "@/lib/bizup/money";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  issued: "Unpaid",
  partially_paid: "Part paid",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
  credited: "Credited",
  superseded: "Replaced",
  corrected: "Corrected",
};

export default async function BizUpInvoicesPage() {
  const account = await currentAccount();
  if (!account) redirect(await bizupLoginPath());

  const admin = createAdminClient();
  const { data: invoices, error } = await admin
    .from("bizup_documents")
    .select("id, number, status, total_incl_cents, due_date, first_viewed_at, bizup_customers(name)")
    .eq("account_id", account.id)
    .eq("doc_type", "invoice")
    .order("created_at", { ascending: false });

  if (error) console.error("KatisoBiz invoice list failed", error);
  const rows = invoices ?? [];

  const today = new Date().toISOString().slice(0, 10);
  // Sec 6: overdue is derived from the due date rather than stored, so it
  // is always right without a nightly job to keep it right.
  const isOverdue = (r: (typeof rows)[number]) =>
    r.due_date != null && r.due_date < today && (r.status === "issued" || r.status === "partially_paid");

  const outstanding = rows
    .filter((r) => r.status === "issued" || r.status === "partially_paid")
    .reduce((s, r) => s + r.total_incl_cents, 0);

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 p-6">
        <Link href="/bizup" className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-brand hover:underline">
          Back to KatisoBiz
        </Link>

        {/* Dewald, 2026-07-28: "sometimes they skip quotations and do a
            straight invoice, this is not possible". It was possible, but
            only from the home dashboard, and this page said the opposite.
            A form rather than a link because Next prefetches links on
            hover and would create empty drafts against their cap. */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold tracking-tight text-ink">Invoices</h1>
          <form action={createInvoice}>
            <button
              type="submit"
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
            >
              New invoice
            </button>
          </form>
        </div>

        {outstanding > 0 && (
          <p className="rounded-2xl border border-gray-100 bg-white p-4 text-sm shadow-sm">
            <span className="font-semibold text-ink">{formatZar(outstanding)}</span>
            <span className="text-gray-500"> still owed to you</span>
          </p>
        )}

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            {/* The old copy named only the quote route, which is why a
                real tester concluded a straight invoice could not be done.
                Both routes now, invoice first. */}
            <p className="text-sm text-gray-500">
              No invoices yet. Start one straight away, or turn an accepted quote into an invoice.
            </p>
            <form action={createInvoice} className="mt-4">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
              >
                New invoice
              </button>
            </form>
            <Link href="/bizup/quotes" className="mt-3 inline-block text-sm font-semibold text-brand underline-offset-2 hover:underline">
              Go to your quotes
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((r) => {
              const customer = r.bizup_customers as unknown as { name: string } | null;
              const overdue = isOverdue(r);
              return (
                <li key={r.id}>
                  <Link
                    href={`/bizup/invoices/${r.id}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-brand"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-semibold text-ink">
                        {r.number ?? "Draft"}
                        {customer ? ` • ${customer.name}` : ""}
                      </span>
                      <span className={`text-sm ${overdue ? "font-medium text-red-600" : "text-gray-500"}`}>
                        {overdue ? "Overdue" : (STATUS_LABEL[r.status] ?? r.status)}
                        {r.first_viewed_at ? " • Opened by customer" : ""}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold text-ink">{formatZar(r.total_incl_cents)}</span>
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
