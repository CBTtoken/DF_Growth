import Link from "next/link";
import { blockItem, markDone, skipItem } from "@/app/desk/(app)/actions";
import { doneToday, nextItem } from "@/lib/desk/queries";
import { daysLabel, isDeskState } from "@/lib/desk/types";

// Screen 2. Pick a state, get one item. Never a list.
export const dynamic = "force-dynamic";

const STATES = [
  { key: "wrecked", label: "Wrecked", note: "shallow, oldest first" },
  { key: "normal", label: "Normal", note: "by due date" },
  { key: "sharp", label: "Sharp", note: "deep work" },
] as const;

export default async function DeskTodayPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; skipped?: string }>;
}) {
  const { state: stateParam, skipped } = await searchParams;
  const state = isDeskState(stateParam) ? stateParam : null;

  const [item, done] = await Promise.all([
    state ? nextItem(state, skipped) : Promise.resolve(null),
    doneToday(),
  ]);

  const button =
    "flex-1 rounded-2xl px-4 py-6 text-base font-semibold transition-colors active:opacity-80";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-5">
      <div className="flex gap-3">
        {STATES.map((s) => (
          <Link
            key={s.key}
            href={`/desk/today?state=${s.key}`}
            className={`${button} text-center ${
              state === s.key ? "bg-neutral-900 text-white" : "bg-white text-neutral-900 border border-neutral-200"
            }`}
          >
            {s.label}
            <span className="mt-1 block text-[11px] font-normal opacity-60">{s.note}</span>
          </Link>
        ))}
      </div>

      {state && !item ? (
        <p className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-500">
          Nothing open in that state. Everything left is either waiting on somebody else, or in one of
          the other two.
        </p>
      ) : null}

      {state && item ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5">
          <div>
            <p className="text-lg font-semibold leading-snug">{item.title}</p>
            <p className="mt-2 text-sm text-neutral-600">
              {item.next_action ?? "No next action written yet."}
            </p>
            <p className="mt-3 text-xs text-neutral-400">
              {item.venture ?? "unfiled"} &middot; {item.effort} &middot; open {daysLabel(item.created_at.slice(0, 10))}
              {item.due_date ? ` · due ${item.due_date}` : ""}
            </p>
          </div>

          <div className="flex gap-2">
            <form action={markDone} className="flex-1">
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="state" value={state} />
              <button className="w-full rounded-xl bg-neutral-900 px-3 py-4 text-sm font-semibold text-white">
                Done
              </button>
            </form>

            <form action={skipItem} className="flex-1">
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="state" value={state} />
              <input type="hidden" name="skip_count" value={item.skip_count} />
              <button className="w-full rounded-xl border border-neutral-300 px-3 py-4 text-sm font-semibold text-neutral-700">
                Skip
              </button>
            </form>
          </div>

          <form action={blockItem} className="flex gap-2">
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="state" value={state} />
            <input
              name="blocked_by"
              spellCheck={false}
              placeholder="Blocked by who"
              className="flex-1 rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none focus:border-neutral-900"
            />
            <button className="rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-700">
              Off my list
            </button>
          </form>

          <Link href={`/desk/item/${item.id}`} className="text-xs text-neutral-400 underline">
            Edit this item
          </Link>
        </div>
      ) : null}

      {!state ? (
        <p className="text-sm text-neutral-500">Pick the state you are actually in.</p>
      ) : null}

      {/* A plain list of what was finished today. No count anywhere else, no
          streak, no score. */}
      {done.length > 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-neutral-400">Done today</p>
          <ul className="mt-3 flex flex-col gap-2">
            {done.map((d) => (
              <li key={d.id} className="text-sm text-neutral-600">
                {d.title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
