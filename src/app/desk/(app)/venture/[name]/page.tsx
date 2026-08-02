import Link from "next/link";
import { listItems, listVentures } from "@/lib/desk/queries";
import { effortLabel, type DeskItem } from "@/lib/desk/types";
import { EndStateForm } from "@/components/desk/EndStateForm";
import { Screen, card, label } from "@/components/desk/Shell";

export const dynamic = "force-dynamic";

const GROUPS: { key: DeskItem["status"]; heading: string }[] = [
  { key: "open", heading: "Open" },
  { key: "parked", heading: "Parked" },
  { key: "done", heading: "Done" },
  { key: "killed", heading: "Killed" },
];

export default async function DeskVenturePage({ params }: { params: Promise<{ name: string }> }) {
  const { name: encoded } = await params;
  const name = decodeURIComponent(encoded);

  const [items, ventures] = await Promise.all([listItems({ venture: name }), listVentures()]);
  const venture = ventures.find((v) => v.name === name);

  return (
    <Screen title={name} back={{ href: "/desk/map", label: "Map" }}>
      <div className={card}>
        <EndStateForm
          name={name}
          endState={venture?.end_state ?? ""}
          stream={venture?.stream ?? items[0]?.stream ?? "own"}
        />
      </div>

      {GROUPS.map((group) => {
        const rows = items.filter((i) => i.status === group.key);
        if (rows.length === 0) return null;

        return (
          <section key={group.key} className="flex flex-col gap-2">
            <p className={label}>
              {group.heading}, {rows.length}
            </p>

            {rows.map((item) => (
              <Link key={item.id} href={`/desk/item/${item.id}`} className={`${card} block`}>
                <p className="text-sm text-neutral-900 whitespace-pre-line">{item.title}</p>
                {item.next_action ? (
                  <p className="mt-1 text-xs text-neutral-500">{item.next_action}</p>
                ) : null}
                <p className="mt-2 text-xs text-neutral-400">
                  {effortLabel(item.effort)}
                  {item.blocked_by !== "me" ? ` · waiting on ${item.blocked_by}` : ""}
                  {item.park_trigger ? ` · comes back when: ${item.park_trigger}` : ""}
                  {item.due_date ? ` · due ${item.due_date}` : ""}
                </p>
              </Link>
            ))}
          </section>
        );
      })}

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Nothing filed under this venture yet. An empty list here means nothing is captured, not that
          the work is finished.
        </p>
      ) : null}
    </Screen>
  );
}
