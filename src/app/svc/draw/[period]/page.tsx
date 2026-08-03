import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { svcCanonical, svcPath } from "@/lib/svc/host";
import { getDraw } from "@/lib/svc/draw";
import { createSvcClient } from "@/lib/svc/db";
import { formatRand } from "@/lib/svc/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ period: string }>;
}): Promise<Metadata> {
  const { period } = await params;
  const month = /^\d{4}-\d{2}-01$/.test(period)
    ? new Date(`${period}T00:00:00Z`).toLocaleDateString("en-ZA", { month: "long", year: "numeric" })
    : "Result";
  return {
    title: `Draw result, ${month}`,
    description: `The published result of Smart Value Club's ${month} members draw, with the seed and total entry count.`,
    alternates: { canonical: svcCanonical(`/draw/${period}`) },
  };
}

// One published result (handoff 10.3): period, prize, total entries,
// seed, winner by first name and surname initial. Indexed on purpose.
export default async function DrawResultPage({
  params,
}: {
  params: Promise<{ period: string }>;
}) {
  const { period } = await params;
  if (!/^\d{4}-\d{2}-01$/.test(period)) notFound();

  const draw = await getDraw(period);
  if (!draw || draw.status !== "published" || !draw.winner_member_id) notFound();

  const db = createSvcClient();
  const { data: winner } = await db
    .from("member")
    .select("first_name, surname")
    .eq("id", draw.winner_member_id)
    .maybeSingle();

  const winnerLabel = winner ? `${winner.first_name} ${winner.surname.charAt(0).toUpperCase()}.` : "A member";
  const month = new Date(`${period}T00:00:00Z`).toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
  const drawHref = await svcPath("/draw");

  return (
    <div>
      <section className="bg-svc-blue px-4 py-12 text-white sm:py-16">
        <div className="mx-auto w-full max-w-3xl">
          <Link href={drawHref} className="text-sm font-semibold text-white underline">
            All results
          </Link>
          <h1 className="mt-2 font-svc-heading text-3xl font-bold sm:text-4xl">
            The {month} draw
          </h1>
        </div>
      </section>

      <section className="bg-svc-cream px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-3xl">
          <div className="border-4 border-svc-green bg-white/70 p-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-svc-ink/60">Winner</p>
            <p className="mt-2 font-svc-heading text-4xl font-bold text-svc-green">{winnerLabel}</p>
            <p className="mt-2 text-base text-svc-ink/75">
              {draw.prize_description}
              {draw.prize_value_cents ? `, ${formatRand(draw.prize_value_cents)}` : ""}
            </p>
          </div>

          <dl className="mt-8 space-y-3 border-2 border-svc-ink/15 bg-white/60 p-6 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="font-semibold">Total entries in the draw</dt>
              <dd>{draw.total_entries?.toLocaleString("en-ZA")}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="font-semibold">Entries frozen at</dt>
              <dd>{draw.frozen_at ? new Date(draw.frozen_at).toLocaleString("en-ZA") : ""}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="font-semibold">Selection seed</dt>
              <dd className="break-all font-mono text-xs">{draw.seed}</dd>
            </div>
          </dl>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-svc-ink/70">
            The winner is the entry the seed lands on: the seed&apos;s SHA-256
            digest, taken as a number modulo the total entry count, walked over
            the frozen entries in the order they were recorded. Same seed, same
            entries, same winner, on anyone&apos;s machine.
          </p>
        </div>
      </section>
    </div>
  );
}
