import Link from "next/link";
import { nudgeItem, unblockItem } from "@/app/desk/(app)/actions";
import { listItems } from "@/lib/desk/queries";
import { daysLabel, daysSince, type DeskItem } from "@/lib/desk/types";

// Screen 3, and the point of the whole tool: how much of the load is not
// actually his right now.
export const dynamic = "force-dynamic";

export default async function DeskWaitingPage() {
  const items = (await listItems({ status: "open", blockedByMe: false })) as DeskItem[];

  const byPerson = new Map<string, DeskItem[]>();
  for (const item of items) {
    byPerson.set(item.blocked_by, [...(byPerson.get(item.blocked_by) ?? []), item]);
  }

  // Longest wait first, because that is the one that needs a nudge.
  const people = [...byPerson.entries()].sort((a, b) => {
    const oldest = (rows: DeskItem[]) => Math.max(...rows.map((r) => daysSince(r.blocked_since) ?? 0));
    return oldest(b[1]) - oldest(a[1]);
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 p-5">
      <p className="text-sm text-neutral-500">
        {items.length === 0
          ? "Nothing is waiting on anyone else."
          : `${items.length} of these are not yours to move right now.`}
      </p>

      {people.map(([person, rows]) => (
        <div key={person} className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-sm font-semibold">{person === "date" ? "Waiting on a date" : person}</p>

          <ul className="mt-3 flex flex-col gap-4">
            {rows.map((item) => (
              <li key={item.id} className="flex flex-col gap-2">
                <div>
                  <p className="text-sm">{item.title}</p>
                  <p className="text-xs text-neutral-400">waiting {daysLabel(item.blocked_since)}</p>
                </div>

                <div className="flex gap-2">
                  <form action={unblockItem}>
                    <input type="hidden" name="id" value={item.id} />
                    <button className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700">
                      Unblock
                    </button>
                  </form>

                  <form action={nudgeItem}>
                    <input type="hidden" name="id" value={item.id} />
                    <button className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700">
                      Nudge sent
                    </button>
                  </form>

                  <Link
                    href={`/desk/item/${item.id}`}
                    className="rounded-lg px-3 py-2 text-xs text-neutral-400 underline"
                  >
                    Edit
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
