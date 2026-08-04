import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { horizon, ventureRollups } from "@/lib/desk/queries";
import { STREAMS } from "@/lib/desk/types";
import { Screen, card, label } from "@/components/desk/Shell";

// Where everything sits.
//
// This is the screen that answers "what is going on", which Today
// deliberately refuses to answer. Today still hands back one item and never a
// list; this is the other half of that bargain.
export const dynamic = "force-dynamic";

export default async function DeskMapPage() {
  const [rollups, soon] = await Promise.all([ventureRollups(), horizon()]);

  const perStream = (stream: string) => rollups.filter((r) => r.stream === stream);
  const openIn = (stream: string) => perStream(stream).reduce((n, r) => n + r.open, 0);

  const own = openIn("own");
  const client = openIn("client");
  const life = openIn("life");

  // The comparison he asked for, said in a sentence so nobody has to do the
  // arithmetic or read a chart.
  const ratio =
    client === 0
      ? "Nothing open on client work at all right now."
      : `For every one thing open on a client, you have ${(own / client).toFixed(1)} of your own.`;

  const withCC = rollups.reduce((n, r) => n + r.withCC, 0);

  return (
    <Screen title="Map" subtitle="Every venture, where it is going, and how much of it is open.">
      {soon.length > 0 ? (
        <Link href="/desk/horizon" className={`${card} flex items-center gap-3`}>
          <CalendarClock size={18} className="text-neutral-500" />
          <span className="text-sm text-neutral-700">
            {soon.length} dated {soon.length === 1 ? "thing" : "things"} in the next 30 days
          </span>
          <span className="ml-auto text-sm text-neutral-400">Look</span>
        </Link>
      ) : null}

      <div className={card}>
        <p className={label}>Where your capacity is going</p>
        <div className="mt-3 flex gap-3">
          {[
            { n: own, l: "Mine" },
            { n: client, l: "Clients" },
            { n: life, l: "Life" },
          ].map((t) => (
            <div key={t.l} className="flex-1 rounded-xl bg-neutral-100 px-3 py-3">
              <p className="text-2xl font-semibold text-neutral-900">{t.n}</p>
              <p className="text-xs text-neutral-500">{t.l}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-neutral-500">{ratio}</p>
        {withCC > 0 ? (
          <p className="mt-1 text-sm text-neutral-500">
            {withCC} {withCC === 1 ? "thing is" : "things are"} with CC right now, off your plate.
          </p>
        ) : null}
      </div>

      {STREAMS.map((stream) => {
        const rows = perStream(stream.key);
        if (rows.length === 0) return null;

        return (
          <section key={stream.key} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">{stream.label}</h2>
              <p className="text-xs text-neutral-400">{stream.blurb}</p>
            </div>

            {rows.map((row) => {
              // How far the venture is: done against everything that is
              // current work. Parked stays out of the fraction because a
              // parked item is waiting on its trigger, not on him.
              const total = row.open + row.waiting + row.done;
              const percent = total > 0 ? Math.round((row.done / total) * 100) : 0;

              return (
                <Link
                  key={row.name}
                  href={`/desk/venture/${encodeURIComponent(row.name)}`}
                  prefetch={false}
                  className={`${card} flex flex-col gap-2`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-semibold text-neutral-900">{row.name}</p>
                    <p className="shrink-0 text-sm text-neutral-500">
                      {row.open} open
                      {row.withCC > 0 ? `, ${row.withCC} with CC` : ""}
                      {row.waiting - row.withCC > 0 ? `, ${row.waiting - row.withCC} waiting` : ""}
                    </p>
                  </div>

                  {row.endState ? (
                    <p className="text-sm leading-snug text-neutral-600">{row.endState}</p>
                  ) : (
                    <p className="text-sm italic text-neutral-400">
                      No end state written yet. Tap to write one.
                    </p>
                  )}

                  {/* The measure he asked for: how far this is, in one thin
                      line and one sentence. Not a chart, a fraction. */}
                  {total > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className="h-full rounded-full bg-neutral-900"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <p className="shrink-0 text-xs text-neutral-400">
                        {row.done} of {total} done
                      </p>
                    </div>
                  ) : null}

                  {/* Effort, so you can tell focus work from break work before
                      you open anything. */}
                  <p className="text-xs text-neutral-400">
                    {row.deep} need a clear head &middot; {row.shallow} can be done tired
                    {row.parked > 0 ? ` · ${row.parked} parked` : ""}
                  </p>
                </Link>
              );
            })}
          </section>
        );
      })}
    </Screen>
  );
}
