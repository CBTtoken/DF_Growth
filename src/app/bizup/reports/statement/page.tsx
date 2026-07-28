import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { bizupLoginPath } from "@/lib/bizup/product";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { capabilitiesFor, type BizUpPlan } from "@/lib/bizup/entitlements";
import { loadStatement, resolvePeriod } from "@/lib/bizup/reports";
import { formatZar } from "@/lib/bizup/money";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Sec 12 report 7, the client statement.
//
// Deliberately in the R49 tier and not held back for R89: "a statement is a
// chasing-money tool, and chasing money is a core pain for exactly the solo
// operator R49 is aimed at."
//
// Statements are not financial documents in the SARS sense, so they carry
// no number series and can be regenerated freely. That is why this is a
// plain page rather than anything that allocates a number.

export default async function BizUpStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; period?: string; from?: string; to?: string }>;
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

  if (!capabilitiesFor(account.plan as BizUpPlan).clientStatements) {
    redirect("/bizup/reports");
  }

  const params = await searchParams;
  const period = resolvePeriod(params.period, account.financial_year_end_month, {
    from: params.from,
    to: params.to,
  });

  const { data: customers } = await admin
    .from("bizup_customers")
    .select("id, name")
    .eq("account_id", account.id)
    .order("name");

  const statement = params.customer
    ? await loadStatement(account.id, params.customer, period)
    : null;

  const qs = `period=${period.id}&from=${period.from}&to=${period.to}`;

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 p-6">
        <Link href={`/bizup/reports?${qs}`} className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-brand hover:underline">
          Back to reports
        </Link>

        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Customer statement</h1>
          <p className="mt-1 text-sm text-gray-500">
            Everything one customer was invoiced and everything they paid, with the balance at the
            bottom. {period.label}.
          </p>
        </div>

        <form method="get" className="flex flex-wrap items-end gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <input type="hidden" name="period" value={period.id} />
          <input type="hidden" name="from" value={period.from} />
          <input type="hidden" name="to" value={period.to} />
          <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-gray-600">
            Customer
            <select
              name="customer"
              defaultValue={params.customer ?? ""}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-base"
            >
              <option value="">Choose a customer</option>
              {(customers ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark">
            Show
          </button>
        </form>

        {(customers ?? []).length === 0 && (
          <p className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-500">
            You have no customers yet. Add one and invoice them, and their statement will appear
            here.
          </p>
        )}

        {statement && (
          <>
            <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="font-semibold text-ink">{statement.customer.name}</p>
                <p className="text-xs text-gray-500">
                  {period.from} to {period.to}
                </p>
              </div>

              {statement.lines.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-gray-500">
                  Nothing invoiced or paid in this period.
                </p>
              ) : (
                statement.lines.map((l, i) => (
                  <div
                    key={`${l.reference}-${i}`}
                    className={`flex items-start justify-between gap-3 px-4 py-3 text-sm ${i > 0 ? "border-t border-gray-100" : ""}`}
                  >
                    <span className="min-w-0">
                      <span className="block font-medium text-ink">
                        {l.kind === "payment"
                          ? "Payment"
                          : l.kind === "credit_note"
                            ? "Credit note"
                            : "Invoice"}{" "}
                        {l.kind !== "payment" && l.reference}
                      </span>
                      <span className="block text-xs text-gray-500">
                        {l.date}
                        {l.kind === "payment" && ` · ${l.reference}`}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span
                        className={`block font-semibold ${l.amountCents < 0 ? "text-green-700" : "text-ink"}`}
                      >
                        {l.amountCents < 0 ? "-" : ""}
                        {formatZar(Math.abs(l.amountCents))}
                      </span>
                      <span className="block text-xs text-gray-400">
                        {formatZar(l.runningBalanceCents)}
                      </span>
                    </span>
                  </div>
                ))
              )}

              <div className="flex items-center justify-between gap-3 border-t-2 border-gray-200 px-4 py-4">
                <span className="font-bold text-ink">Balance owing</span>
                <span
                  className={`text-lg font-bold ${statement.closingBalanceCents > 0 ? "text-ink" : "text-green-700"}`}
                >
                  {formatZar(statement.closingBalanceCents)}
                </span>
              </div>
            </section>

            <div className="flex flex-wrap gap-3">
              <a
                href={`/bizup/reports/statement/csv?customer=${statement.customer.id}&${qs}`}
                className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-brand hover:text-brand"
              >
                Download as CSV
              </a>
              {statement.closingBalanceCents > 0 && statement.customer.whatsapp && (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Good day ${statement.customer.name}, here is your statement to ${period.to}. Balance owing: ${formatZar(statement.closingBalanceCents)}.`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-95"
                >
                  Send on WhatsApp
                </a>
              )}
            </div>
          </>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
