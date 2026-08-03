import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { svcPath } from "@/lib/svc/host";
import { getSvcAdmin } from "@/lib/svc/admin";
import { createSvcClient } from "@/lib/svc/db";
import { formatRand } from "@/lib/svc/data";
import { periodFor } from "@/lib/svc/ledger";
import { saveDraw, freezeDrawNow, drawWinnerNow, publishDrawNow, fulfilPrizeNow } from "./actions";
import { svcBtnGreen, svcInput, svcLabel } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "Draws",
  robots: { index: false, follow: false },
};

// Draw admin (handoff 10.3): configure while open; after the freeze the
// screen shows per-source totals only, never individual entries, and no
// control that could alter them exists. The lifecycle is freeze, draw,
// publish, fulfil, each its own deliberate press.
export default async function AdminDrawsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const admin = await getSvcAdmin();
  if (!admin) redirect(`${await svcPath("/login")}`);

  const db = createSvcClient();
  const { data: draws } = await db
    .from("draw")
    .select(
      "id, period, prize_description, prize_value_cents, cutoff_at, frozen_at, free_entries_per_member, earn_threshold_cents, ticket_price_cents, purchase_enabled, seed, total_entries, status, prize_issue_id, winner:winner_member_id (first_name, surname)"
    )
    .order("period", { ascending: false })
    .limit(12);

  // Per-source totals for frozen-and-later draws.
  const totalsByDraw = new Map<string, Record<string, number>>();
  for (const d of draws ?? []) {
    if (d.status === "open") continue;
    const { data: rows } = await db.from("draw_entry").select("source, entry_count").eq("draw_id", d.id);
    const t: Record<string, number> = { free: 0, earned: 0, purchased: 0 };
    for (const r of rows ?? []) t[r.source] = (t[r.source] ?? 0) + r.entry_count;
    totalsByDraw.set(d.id, t);
  }

  const adminHref = await svcPath("/admin");
  const currentPeriod = periodFor();
  const hasCurrent = (draws ?? []).some((d) => d.period === currentPeriod);

  const feedback = params.saved
    ? "Draw saved."
    : params.frozen !== undefined
      ? `Frozen with ${params.frozen} total entries. Nothing can change them now.`
      : params.drawn
        ? "Winner drawn. Publish when ready."
        : params.published
          ? "Published, and the winner has been emailed."
          : params.fulfilled
            ? "Prize recorded in the winner's ledger."
            : params.error
              ? `That did not work: ${params.error}.`
              : null;

  return (
    <div className="bg-svc-cream px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-3xl">
        <Link href={adminHref} className="text-sm font-semibold text-svc-blue underline">
          Back to admin
        </Link>
        <h1 className="mt-2 font-svc-heading text-3xl font-bold">Draws</h1>

        {feedback && <p className="mt-4 border-2 border-svc-blue bg-white/60 p-4 text-sm">{feedback}</p>}

        <section className="mt-6 border-2 border-svc-ink/15 bg-white/60 p-6">
          <h2 className="font-svc-heading text-lg font-bold">
            {hasCurrent ? "Reconfigure this month's draw (open only)" : "Create this month's draw"}
          </h2>
          <form action={saveDraw} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="d-period" className={svcLabel}>Month (first day)</label>
                <input id="d-period" name="period" defaultValue={currentPeriod} pattern="\d{4}-\d{2}-01" className={`mt-2 ${svcInput}`} />
              </div>
              <div>
                <label htmlFor="d-cutoff" className={svcLabel}>Cutoff (published, e.g. 2026-08-31T18:00)</label>
                <input id="d-cutoff" name="cutoff" type="datetime-local" required className={`mt-2 ${svcInput}`} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="d-prize" className={svcLabel}>Prize description</label>
                <input id="d-prize" name="prize" type="text" required placeholder="A R2,000 grocery voucher" className={`mt-2 ${svcInput}`} />
              </div>
              <div>
                <label htmlFor="d-value" className={svcLabel}>Prize value in Rand</label>
                <input id="d-value" name="prizeValue" type="text" inputMode="decimal" placeholder="2000" className={`mt-2 ${svcInput}`} />
              </div>
              <div>
                <label htmlFor="d-free" className={svcLabel}>Free entries per member</label>
                <input id="d-free" name="freeEntries" type="number" min={0} defaultValue={5} className={`mt-2 ${svcInput}`} />
              </div>
              <div>
                <label htmlFor="d-threshold" className={svcLabel}>Rand redeemed per earned entry</label>
                <input id="d-threshold" name="threshold" type="text" inputMode="decimal" defaultValue="50" className={`mt-2 ${svcInput}`} />
              </div>
              <div>
                <label htmlFor="d-ticket" className={svcLabel}>Ticket price in Rand (purchased entries)</label>
                <input id="d-ticket" name="ticketPrice" type="text" inputMode="decimal" placeholder="10" className={`mt-2 ${svcInput}`} />
              </div>
            </div>
            <label className="flex items-start gap-3 text-sm leading-relaxed">
              <input type="checkbox" name="purchaseEnabled" className="mt-1 h-5 w-5 shrink-0 accent-svc-green" />
              <span>
                Purchased entries ON for this draw. Leave OFF until the written
                legal clearance exists; the default is off and everything
                member-facing hides and refuses while it is.
              </span>
            </label>
            <button type="submit" className={svcBtnGreen}>Save draw</button>
          </form>
        </section>

        <section className="mt-6 space-y-4">
          {(draws ?? []).map((d) => {
            const winner = d.winner as unknown as { first_name: string; surname: string } | null;
            const totals = totalsByDraw.get(d.id);
            return (
              <article key={d.id} className="border-2 border-svc-ink/15 bg-white/60 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-svc-heading text-lg font-bold">
                      {new Date(`${d.period}T00:00:00Z`).toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}
                    </h3>
                    <p className="text-sm text-svc-ink/70">
                      {d.prize_description}
                      {d.prize_value_cents ? ` (${formatRand(d.prize_value_cents)})` : ""}
                    </p>
                    <p className="text-xs text-svc-ink/50">
                      Cutoff {new Date(d.cutoff_at).toLocaleString("en-ZA")}. Purchases{" "}
                      {d.purchase_enabled ? "ON" : "off"}.
                    </p>
                  </div>
                  <span className="text-xs font-bold uppercase text-svc-blue">{d.status}</span>
                </div>

                {totals && (
                  <p className="mt-3 text-sm">
                    Entries: {totals.free} free, {totals.earned} earned, {totals.purchased} purchased,{" "}
                    <span className="font-bold">{d.total_entries ?? 0} total</span>.
                    {d.seed && (
                      <span className="block break-all text-xs text-svc-ink/50">Seed: {d.seed}</span>
                    )}
                  </p>
                )}
                {winner && (
                  <p className="mt-2 text-sm font-semibold text-svc-green">
                    Winner: {winner.first_name} {winner.surname}
                    {d.prize_issue_id ? " (prize recorded in their ledger)" : ""}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {d.status === "open" && (
                    <form action={freezeDrawNow}>
                      <input type="hidden" name="draw" value={d.id} />
                      <button type="submit" className="inline-flex min-h-11 items-center bg-svc-ink px-4 text-sm font-semibold text-white hover:bg-svc-blue">
                        Freeze entries now
                      </button>
                    </form>
                  )}
                  {d.status === "frozen" && (
                    <form action={drawWinnerNow}>
                      <input type="hidden" name="draw" value={d.id} />
                      <button type="submit" className="inline-flex min-h-11 items-center bg-svc-green px-4 text-sm font-semibold text-white hover:bg-svc-ink">
                        Draw the winner
                      </button>
                    </form>
                  )}
                  {d.status === "drawn" && (
                    <form action={publishDrawNow}>
                      <input type="hidden" name="draw" value={d.id} />
                      <button type="submit" className="inline-flex min-h-11 items-center bg-svc-green px-4 text-sm font-semibold text-white hover:bg-svc-ink">
                        Publish the result
                      </button>
                    </form>
                  )}
                  {(d.status === "drawn" || d.status === "published") && !d.prize_issue_id && (
                    <form action={fulfilPrizeNow}>
                      <input type="hidden" name="draw" value={d.id} />
                      <button type="submit" className="inline-flex min-h-11 items-center border-2 border-svc-green px-4 text-sm font-semibold text-svc-green hover:bg-svc-green hover:text-white">
                        Record prize fulfilment
                      </button>
                    </form>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
