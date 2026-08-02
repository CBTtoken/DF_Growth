import Link from "next/link";
import { doneToday, nextItems } from "@/lib/desk/queries";
import { isDeskState } from "@/lib/desk/types";
import { TodayCard } from "@/components/desk/TodayCard";
import { Screen } from "@/components/desk/Shell";

// Screen 2. Pick the state you are actually in, get one item.
export const dynamic = "force-dynamic";

const STATES = [
  { key: "wrecked", label: "Wrecked", note: "can be done tired" },
  { key: "normal", label: "Normal", note: "by what is due" },
  { key: "sharp", label: "Sharp", note: "needs a clear head" },
] as const;

export default async function DeskTodayPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state: stateParam } = await searchParams;
  const state = isDeskState(stateParam) ? stateParam : null;

  const [items, done] = await Promise.all([
    state ? nextItems(state) : Promise.resolve([]),
    doneToday(),
  ]);

  return (
    <Screen title="Today" subtitle={state ? undefined : "Pick the state you are actually in."}>
      <div className="flex gap-2">
        {STATES.map((s) => (
          <Link
            key={s.key}
            href={`/desk/today?state=${s.key}`}
            prefetch
            className={`flex-1 rounded-2xl px-2 py-5 text-center text-base font-semibold transition-colors ${
              state === s.key
                ? "bg-neutral-900 text-white"
                : "border border-neutral-200 bg-white text-neutral-900"
            }`}
          >
            {s.label}
            <span className="mt-1 block text-[11px] font-normal opacity-60">{s.note}</span>
          </Link>
        ))}
      </div>

      {state ? <TodayCard items={items} doneToday={done} /> : null}

      {!state && done.length > 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Done today</p>
          <ul className="mt-3 flex flex-col gap-2">
            {done.map((d) => (
              <li key={d.id} className="text-sm text-neutral-600">
                {d.title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Screen>
  );
}
