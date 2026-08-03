import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { svcPath } from "@/lib/svc/host";
import { getSvcAdmin } from "@/lib/svc/admin";
import { createSvcClient } from "@/lib/svc/db";
import { formatRand } from "@/lib/svc/data";
import { periodFor } from "@/lib/svc/ledger";
import { runPayoutForMonth, runReferralsForMonth, markLinePaid } from "../manage-actions";
import { svcBtnGreen, svcInput, svcLabel } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "Payouts",
  robots: { index: false, follow: false },
};

// The payout screen (handoff 7.3): pick a month, press run, get lines.
// Nothing here moves money; paying happens in the bank and is recorded
// against the line with a date and reference.
export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
    lines?: string;
    skipped?: string;
    earnings?: string;
    memberLines?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const admin = await getSvcAdmin();
  if (!admin) redirect(`${await svcPath("/login")}`);

  const period = /^\d{4}-\d{2}-01$/.test(params.period ?? "") ? params.period! : periodFor();

  const db = createSvcClient();
  const { data: lines } = await db
    .from("payout_line")
    .select(
      "id, payee_type, period, source, item_count, rate_cents, amount_cents, paid_at, paid_reference, partner:partner_id (name), member:member_id (first_name, surname)"
    )
    .eq("period", period)
    .order("payee_type")
    .order("amount_cents", { ascending: false });

  const adminHref = await svcPath("/admin");
  const payoutsHref = await svcPath("/admin/payouts");
  const csvHref = await svcPath(`/admin/payouts/export?period=${period}`);

  const monthLabel = new Date(`${period}T00:00:00Z`).toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });

  const payeeName = (l: { partner: unknown; member: unknown }) => {
    const partner = l.partner as { name: string } | null;
    const member = l.member as { first_name: string; surname: string } | null;
    return partner?.name ?? (member ? `${member.first_name} ${member.surname}` : "Unknown");
  };

  return (
    <div className="bg-svc-cream px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-3xl">
        <Link href={adminHref} className="text-sm font-semibold text-svc-blue underline">
          Back to admin
        </Link>
        <h1 className="mt-2 font-svc-heading text-3xl font-bold">Payouts for {monthLabel}</h1>

        {(params.lines || params.earnings || params.error) && (
          <p className="mt-4 border-2 border-svc-blue bg-white/60 p-4 text-sm">
            {params.lines !== undefined &&
              `Partner run done: ${params.lines} new lines, ${params.skipped ?? 0} already existed.`}
            {params.earnings !== undefined &&
              ` Referral run done: ${params.earnings} earnings recorded, ${params.memberLines ?? 0} member lines created.`}
            {params.error === "reference" && "A reference is needed to mark a line paid."}
            {params.error === "period" && "That month did not parse; use the picker."}
          </p>
        )}

        <form method="get" className="mt-6 flex items-end gap-2">
          <div>
            <label htmlFor="period" className={svcLabel}>Month (first day)</label>
            <input id="period" name="period" defaultValue={period} pattern="\d{4}-\d{2}-01" className={`mt-2 ${svcInput}`} />
          </div>
          <button
            type="submit"
            className="inline-flex min-h-12 items-center justify-center border-2 border-svc-green px-5 text-sm font-semibold text-svc-green hover:bg-svc-green hover:text-white"
          >
            Show month
          </button>
        </form>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <form action={runPayoutForMonth} className="border-2 border-svc-ink/15 bg-white/60 p-5">
            <input type="hidden" name="period" value={period} />
            <h2 className="font-svc-heading text-base font-bold">Partner payout run</h2>
            <p className="mt-1 text-xs text-svc-ink/60">
              Counts the month&apos;s qualifying members and redemptions per
              benefit at the month&apos;s own rates. Safe to re-run.
            </p>
            <button type="submit" className={`mt-3 ${svcBtnGreen}`}>Run for {monthLabel}</button>
          </form>
          <form action={runReferralsForMonth} className="border-2 border-svc-ink/15 bg-white/60 p-5">
            <input type="hidden" name="period" value={period} />
            <h2 className="font-svc-heading text-base font-bold">Referral run</h2>
            <p className="mt-1 text-xs text-svc-ink/60">
              One earning per referral whose referred member was paid and
              active this month, then one line per referrer. Safe to re-run.
            </p>
            <button type="submit" className={`mt-3 ${svcBtnGreen}`}>Run for {monthLabel}</button>
          </form>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="font-svc-heading text-lg font-bold">Lines</h2>
          <a href={csvHref} className="text-sm font-semibold text-svc-blue underline">
            Download CSV
          </a>
        </div>
        <div className="mt-3 space-y-3">
          {(lines ?? []).length === 0 && (
            <p className="border-2 border-svc-ink/15 bg-white/60 p-5 text-sm text-svc-ink/60">
              No lines for this month yet. Run the two runs above.
            </p>
          )}
          {(lines ?? []).map((l) => (
            <div key={l.id} className="border-2 border-svc-ink/15 bg-white/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {payeeName(l)}{" "}
                    <span className="text-xs uppercase text-svc-ink/50">({l.payee_type})</span>
                  </p>
                  <p className="text-xs text-svc-ink/60">
                    {l.source}
                    {l.rate_cents != null && `, ${l.item_count} x ${formatRand(l.rate_cents)}`}
                  </p>
                </div>
                <p className="font-svc-heading text-lg font-bold">{formatRand(l.amount_cents)}</p>
              </div>
              {l.paid_at ? (
                <p className="mt-2 text-xs font-semibold text-svc-green">
                  Paid {new Date(l.paid_at).toLocaleDateString("en-ZA")}, ref {l.paid_reference}
                </p>
              ) : (
                <form action={markLinePaid} className="mt-3 flex gap-2">
                  <input type="hidden" name="line" value={l.id} />
                  <input type="hidden" name="period" value={period} />
                  <input
                    name="reference"
                    type="text"
                    placeholder="Payment reference"
                    required
                    className={`${svcInput} flex-1`}
                  />
                  <button
                    type="submit"
                    className="inline-flex min-h-12 shrink-0 items-center bg-svc-ink px-4 text-sm font-semibold text-white hover:bg-svc-green"
                  >
                    Mark paid
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
