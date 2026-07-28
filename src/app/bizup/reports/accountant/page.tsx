import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { bizupLoginPath } from "@/lib/bizup/product";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { capabilitiesFor, type BizUpPlan } from "@/lib/bizup/entitlements";
import { resolvePeriod, hasPassed } from "@/lib/bizup/period";
import {
  createAccountantExportLink,
  revokeAccountantExportLink,
  exportLinkUrl,
} from "@/app/bizup/reports/accountant/actions";
import { CopyLink } from "@/components/bizup/CopyLink";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AccountantExportPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string; created?: string }>;
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
  if (!capabilitiesFor(account.plan as BizUpPlan).accountantExport) redirect("/bizup/upgrade");

  const params = await searchParams;
  const period = resolvePeriod(params.period, account.financial_year_end_month, {
    from: params.from,
    to: params.to,
  });

  const { data: links } = await admin
    .from("bizup_export_links")
    .select("id, token, period_from, period_to, expires_at, download_count, first_downloaded_at")
    .eq("account_id", account.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const createdUrl = params.created ? await exportLinkUrl(params.created) : null;

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
          <h1 className="text-xl font-bold tracking-tight text-ink">Export for your accountant</h1>
          <p className="mt-1 text-sm text-gray-500">
            One file with every invoice, credit note and payment for the period, as spreadsheets
            they can open in Excel, with all the PDFs alongside.
          </p>
        </div>

        {createdUrl && (
          <section className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <p className="text-sm font-semibold text-green-900">Your link is ready</p>
            <p className="mt-1 text-sm text-green-900">
              Send this to your accountant. It works without a login and stops working in 14 days.
            </p>
            <div className="mt-3">
              <CopyLink url={createdUrl} />
            </div>
          </section>
        )}

        <form
          action={createAccountantExportLink}
          className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
        >
          <input type="hidden" name="period" value={period.id} />
          <h2 className="text-sm font-semibold text-ink">Period</h2>
          <div className="flex flex-wrap gap-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              From
              <input type="date" name="from" defaultValue={period.from} className="rounded-xl border border-gray-200 px-3 py-2 text-base" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              To
              <input type="date" name="to" defaultValue={period.to} className="rounded-xl border border-gray-200 px-3 py-2 text-base" />
            </label>
          </div>
          <button
            type="submit"
            className="self-start rounded-full bg-brand px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark"
          >
            Create the download link
          </button>
          <p className="text-xs text-gray-500">
            We give you a link rather than a file, because the pack contains your customers&rsquo;
            names and addresses and should not sit in an inbox forever.
          </p>
        </form>

        {(links ?? []).length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-ink">Links you have made</h2>
            {(links ?? []).map((l) => {
              const expired = hasPassed(l.expires_at);
              return (
                <div
                  key={l.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-sm shadow-sm"
                >
                  <span>
                    <span className="block font-medium text-ink">
                      {l.period_from} to {l.period_to}
                    </span>
                    <span className="text-xs text-gray-500">
                      {expired ? "Expired" : `Works until ${l.expires_at.slice(0, 10)}`}
                      {" · "}
                      {l.download_count === 0
                        ? "Not opened yet"
                        : `Opened ${l.download_count} ${l.download_count === 1 ? "time" : "times"}`}
                    </span>
                  </span>
                  <form action={revokeAccountantExportLink}>
                    <input type="hidden" name="id" value={l.id} />
                    <button
                      type="submit"
                      className="text-sm font-semibold text-red-600 underline-offset-2 hover:underline"
                    >
                      {expired ? "Remove" : "Stop this link working"}
                    </button>
                  </form>
                </div>
              );
            })}
          </section>
        )}

        {/* Sec 12: "If the member has no accountant, offer at that moment."
            The cross-sell the business plan calls for, and genuinely useful
            to someone who has just produced a year of books and has nobody
            to send them to. */}
        <p className="rounded-2xl border border-gray-100 bg-white p-5 text-sm text-gray-600">
          Do not have an accountant yet?{" "}
          <Link href="/marketplace" className="font-semibold text-brand underline-offset-2 hover:underline">
            Find one on the DigitalFlyer SA marketplace
          </Link>
          .
        </p>
      </div>
      <SiteFooter />
    </main>
  );
}
