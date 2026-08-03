import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { svcPath } from "@/lib/svc/host";
import { getSvcAdmin } from "@/lib/svc/admin";
import { createSvcClient } from "@/lib/svc/db";
import { formatRand } from "@/lib/svc/data";
import { periodFor } from "@/lib/svc/ledger";
import { addBenefitRate, addVoucherBatch } from "../../manage-actions";
import { svcBtnGreen, svcInput, svcLabel } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "Partner",
  robots: { index: false, follow: false },
};

// One partner: benefits, effective-dated rates, voucher batch stock
// counters, and the monthly report downloads (handoff Sprint 3).
export default async function AdminPartnerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const errs = await searchParams;
  const admin = await getSvcAdmin();
  if (!admin) redirect(`${await svcPath("/login")}`);

  const db = createSvcClient();
  const { data: partner } = await db
    .from("partner")
    .select("id, name, contact_person, contact_email, notes, active")
    .eq("id", id)
    .maybeSingle();
  if (!partner) notFound();

  const [{ data: benefits }, { data: batches }, { data: payoutLines }] = await Promise.all([
    db
      .from("benefit")
      .select("id, name, benefit_type, active, benefit_rate (id, cost_model, rate_cents, revenue_share_percent, effective_from, effective_to)")
      .eq("partner_id", id)
      .order("name"),
    db
      .from("voucher_batch")
      .select("id, benefit_id, quantity_supplied, quantity_issued, quantity_redeemed, expiry, code_source")
      .eq("partner_id", id)
      .order("created_at", { ascending: false }),
    db
      .from("payout_line")
      .select("id, period, source, item_count, rate_cents, amount_cents, paid_at, paid_reference")
      .eq("partner_id", id)
      .order("period", { ascending: false })
      .limit(24),
  ]);

  const partnersHref = await svcPath("/admin/partners");
  const reportBase = await svcPath(`/admin/partners/${id}/report`);

  // The last three month starts, for report links.
  const months: string[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - i);
    months.push(periodFor(d));
  }

  const modelLabel: Record<string, string> = {
    per_active_member_per_month: "per active member per month",
    per_redemption: "per redemption",
    revenue_share_percent: "revenue share",
    zero_cost: "zero cost (partner's own marketing spend)",
  };

  return (
    <div className="bg-svc-cream px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-3xl">
        <Link href={partnersHref} className="text-sm font-semibold text-svc-blue underline">
          All partners
        </Link>
        <h1 className="mt-2 font-svc-heading text-3xl font-bold">{partner!.name}</h1>
        {partner!.notes && <p className="mt-1 text-sm text-svc-ink/70">{partner!.notes}</p>}

        {errs.error && (
          <p className="mt-4 border-2 border-svc-blue bg-white/60 p-4 text-sm">
            That did not save; check the fields and try again ({errs.error}).
          </p>
        )}

        <section className="mt-6 border-2 border-svc-ink/15 bg-white/60 p-6">
          <h2 className="font-svc-heading text-lg font-bold">Monthly reports</h2>
          <p className="mt-2 text-sm text-svc-ink/70">
            The PDF with the partner&apos;s name on it, built from the ledger,
            ready to email as it is.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {months.map((m) => (
              <a
                key={m}
                href={`${reportBase}/${m}/pdf`}
                className="inline-flex min-h-11 items-center border-2 border-svc-green px-4 text-sm font-semibold text-svc-green hover:bg-svc-green hover:text-white"
              >
                {new Date(`${m}T00:00:00Z`).toLocaleDateString("en-ZA", { month: "long", year: "numeric" })} PDF
              </a>
            ))}
          </div>
        </section>

        <section className="mt-6 border-2 border-svc-ink/15 bg-white/60 p-6">
          <h2 className="font-svc-heading text-lg font-bold">Benefits and rates</h2>
          <div className="mt-3 space-y-5">
            {(benefits ?? []).map((b) => {
              const rates = (b.benefit_rate as unknown as {
                id: string;
                cost_model: string;
                rate_cents: number | null;
                revenue_share_percent: number | null;
                effective_from: string;
                effective_to: string | null;
              }[] | null) ?? [];
              return (
                <div key={b.id} className="border-l-4 border-svc-green pl-4">
                  <h3 className="font-svc-heading text-base font-bold">{b.name}</h3>
                  <p className="text-xs uppercase tracking-wide text-svc-ink/50">{b.benefit_type}</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {rates.length === 0 && (
                      <li className="text-svc-ink/60">
                        No rate on record: the package builder shows this cost as zero and warns.
                      </li>
                    )}
                    {rates
                      .sort((x, y) => y.effective_from.localeCompare(x.effective_from))
                      .map((r) => (
                        <li key={r.id}>
                          {modelLabel[r.cost_model] ?? r.cost_model}
                          {r.rate_cents != null && `, ${formatRand(r.rate_cents)}`}
                          {r.revenue_share_percent != null && `, ${r.revenue_share_percent}%`}
                          , from {r.effective_from}
                          {r.effective_to ? ` to ${r.effective_to}` : " (current)"}
                        </li>
                      ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <form action={addBenefitRate} className="mt-6 space-y-4 border-t-2 border-svc-ink/10 pt-4">
            <h3 className="font-svc-heading text-base font-bold">Add a rate</h3>
            <input type="hidden" name="partner" value={id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="r-benefit" className={svcLabel}>Benefit</label>
                <select id="r-benefit" name="benefit" required className={`mt-2 ${svcInput}`}>
                  <option value="">Choose</option>
                  {(benefits ?? []).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="r-model" className={svcLabel}>Cost model</label>
                <select id="r-model" name="costModel" required className={`mt-2 ${svcInput}`}>
                  <option value="per_active_member_per_month">Per active member per month</option>
                  <option value="per_redemption">Per redemption</option>
                  <option value="revenue_share_percent">Revenue share percent</option>
                  <option value="zero_cost">Zero cost</option>
                </select>
              </div>
              <div>
                <label htmlFor="r-rate" className={svcLabel}>Rate in Rand (for the two Rand models)</label>
                <input id="r-rate" name="rate" type="text" inputMode="decimal" className={`mt-2 ${svcInput}`} />
              </div>
              <div>
                <label htmlFor="r-share" className={svcLabel}>Share percent (for revenue share)</label>
                <input id="r-share" name="revShare" type="text" inputMode="decimal" className={`mt-2 ${svcInput}`} />
              </div>
              <div>
                <label htmlFor="r-from" className={svcLabel}>Effective from (YYYY-MM-DD)</label>
                <input id="r-from" name="effectiveFrom" type="text" placeholder={periodFor()} required className={`mt-2 ${svcInput}`} />
              </div>
            </div>
            <p className="text-xs text-svc-ink/60">
              The previous open rate closes the day before this one starts.
              Past months keep the rate that was in effect then; a payout run
              for August is never altered by a September rate.
            </p>
            <button type="submit" className={svcBtnGreen}>Save rate</button>
          </form>
        </section>

        <section className="mt-6 border-2 border-svc-ink/15 bg-white/60 p-6">
          <h2 className="font-svc-heading text-lg font-bold">Voucher batches</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(batches ?? []).length === 0 && <li className="text-svc-ink/60">None yet.</li>}
            {(batches ?? []).map((vb) => {
              const benefitName = (benefits ?? []).find((b) => b.id === vb.benefit_id)?.name ?? "Benefit";
              const remaining = vb.quantity_supplied - vb.quantity_issued;
              return (
                <li key={vb.id} className="border-l-4 border-svc-blue pl-3">
                  {benefitName}: {vb.quantity_supplied} supplied, {vb.quantity_issued} issued,{" "}
                  <span className={remaining === 0 ? "font-bold" : ""}>{remaining} remaining</span>
                  {vb.expiry ? `, expires ${vb.expiry}` : ""}
                  {remaining === 0 && (
                    <span className="ml-2 inline-block bg-svc-amber px-2 py-0.5 text-xs font-bold uppercase text-svc-ink">
                      Exhausted, issuing blocked
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          <form action={addVoucherBatch} className="mt-5 space-y-4 border-t-2 border-svc-ink/10 pt-4">
            <h3 className="font-svc-heading text-base font-bold">Add a batch</h3>
            <input type="hidden" name="partner" value={id} />
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="vb-benefit" className={svcLabel}>Benefit</label>
                <select id="vb-benefit" name="benefit" required className={`mt-2 ${svcInput}`}>
                  <option value="">Choose</option>
                  {(benefits ?? []).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="vb-qty" className={svcLabel}>Quantity supplied</label>
                <input id="vb-qty" name="quantity" type="number" min={1} required className={`mt-2 ${svcInput}`} />
              </div>
              <div>
                <label htmlFor="vb-expiry" className={svcLabel}>Expiry (optional)</label>
                <input id="vb-expiry" name="expiry" type="text" placeholder="YYYY-MM-DD" className={`mt-2 ${svcInput}`} />
              </div>
            </div>
            <div>
              <label htmlFor="vb-source" className={svcLabel}>Code source note (optional)</label>
              <input id="vb-source" name="codeSource" type="text" className={`mt-2 ${svcInput}`} />
            </div>
            <button type="submit" className={svcBtnGreen}>Save batch</button>
          </form>
        </section>

        <section className="mt-6 border-2 border-svc-ink/15 bg-white/60 p-6">
          <h2 className="font-svc-heading text-lg font-bold">Payout lines</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {(payoutLines ?? []).length === 0 && <li className="text-svc-ink/60">No runs yet.</li>}
            {(payoutLines ?? []).map((l) => (
              <li key={l.id}>
                {l.period.slice(0, 7)}: {l.item_count} x {l.rate_cents != null ? formatRand(l.rate_cents) : "?"} ={" "}
                <span className="font-semibold">{formatRand(l.amount_cents)}</span>
                {l.paid_at
                  ? ` (paid ${new Date(l.paid_at).toLocaleDateString("en-ZA")}, ref ${l.paid_reference})`
                  : " (unpaid)"}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
