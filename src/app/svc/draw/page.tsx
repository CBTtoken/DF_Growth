import type { Metadata } from "next";
import Link from "next/link";
import { svcCanonical, svcPath } from "@/lib/svc/host";
import { listPublishedDraws, currentDraw } from "@/lib/svc/draw";
import { formatRand } from "@/lib/svc/data";
import { svcBtnPrimary } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "The monthly draw",
  description:
    "Smart Value Club's monthly members draw: how entries work, and every published result with its seed and total entry count, open for anyone to check.",
  alternates: { canonical: svcCanonical("/draw") },
};

// The public draw page (handoff 10.3): the mechanics in plain language
// and every published result. Purchased entries are DESCRIBED here only
// when a current draw has the flag on, with no price, no picker and no
// control; a logged-out visitor reads about it and cannot act on it.
export default async function DrawPage() {
  const [published, current] = await Promise.all([listPublishedDraws(), currentDraw()]);
  const joinHref = await svcPath("/join");
  const drawBase = await svcPath("/draw");

  return (
    <div>
      <section className="bg-svc-blue px-4 py-12 text-white sm:py-16">
        <div className="mx-auto w-full max-w-4xl">
          <h1 className="font-svc-heading text-3xl font-bold sm:text-4xl">The monthly members draw</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/85">
            Every active member is in it automatically, every month. Every
            result is published with the numbers that let you check it.
          </p>
        </div>
      </section>

      <section className="bg-svc-cream px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-4xl space-y-8">
          <div>
            <h2 className="font-svc-heading text-2xl font-bold">How entries work</h2>
            <ul className="mt-3 space-y-2 text-base leading-relaxed">
              <li className="border-l-4 border-svc-green pl-3">
                <span className="font-semibold">Free entries:</span> every active
                member gets {current?.free_entries_per_member ?? 5} each month,
                automatically. No forms, no cost.
              </li>
              <li className="border-l-4 border-svc-green pl-3">
                <span className="font-semibold">Earned entries:</span> one more for
                every {current ? formatRand(current.earn_threshold_cents) : "R50"} of
                coupon value you actually redeem in the month. Real use, not
                selections.
              </li>
              {current?.purchase_enabled && (
                <li className="border-l-4 border-svc-green pl-3">
                  <span className="font-semibold">Purchased entries:</span> active
                  members on a qualifying membership can buy extra entries from
                  inside their own dashboard. Membership itself is what carries
                  the value; entries cannot be bought here or by anyone who is
                  not a paid-up member.
                </li>
              )}
            </ul>
          </div>

          <div>
            <h2 className="font-svc-heading text-2xl font-bold">How the winner is picked</h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed">
              Entries freeze at the published cutoff; after that moment nothing
              can be added or changed by anyone, including us. A random seed
              picks the winner, and we publish the seed and the total entry
              count with every result, so the draw can be checked rather than
              taken on trust.
            </p>
          </div>

          <div>
            <h2 className="font-svc-heading text-2xl font-bold">Published results</h2>
            {published.length === 0 ? (
              <p className="mt-3 max-w-2xl border-2 border-svc-ink/15 bg-white/60 p-5 text-base leading-relaxed text-svc-ink/75">
                The first result appears here after the first monthly draw
                closes, with its seed and entry count alongside it.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {published.map((d) => (
                  <Link
                    key={d.id}
                    href={`${drawBase}/${d.period}`}
                    className="flex items-center justify-between border-2 border-svc-ink/15 bg-white/60 p-5 hover:border-svc-green"
                  >
                    <div>
                      <h3 className="font-svc-heading text-lg font-bold">
                        {new Date(`${d.period}T00:00:00Z`).toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}
                      </h3>
                      <p className="text-sm text-svc-ink/70">{d.prize_description}</p>
                    </div>
                    <span className="text-sm font-semibold text-svc-blue">
                      {d.total_entries?.toLocaleString("en-ZA")} entries
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="text-center">
            <Link href={joinHref} className={svcBtnPrimary}>
              Join and you are in this month&apos;s draw
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
