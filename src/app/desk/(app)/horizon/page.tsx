import Link from "next/link";
import { horizon } from "@/lib/desk/queries";
import { effortLabel, untilLabel } from "@/lib/desk/types";
import { Screen, card, label } from "@/components/desk/Shell";

// Everything dated in the next 30 days, personal and business together.
//
// Not a calendar. No month grid, no week columns, no time slots: he has few
// appointments and many deadlines, and a grid is a browsing tool for the
// opposite problem.
export const dynamic = "force-dynamic";

function heading(date: string): string {
  const days = Math.floor((new Date(`${date}T00:00:00Z`).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return "Late";
  if (days <= 7) return "This week";
  if (days <= 14) return "Next week";
  return "Later this month";
}

export default async function DeskHorizonPage() {
  const rows = await horizon();

  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = heading(row.date);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const order = ["Late", "This week", "Next week", "Later this month"];

  return (
    <Screen
      title="Next 30 days"
      subtitle="Deadlines and renewals, in date order. Everything else has no date and is not your problem today."
      back={{ href: "/desk/map", label: "Map" }}
    >
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing dated in the next 30 days.</p>
      ) : null}

      {order
        .filter((key) => groups.has(key))
        .map((key) => (
          <section key={key} className="flex flex-col gap-2">
            <p className={label}>{key}</p>

            {groups.get(key)!.map((row) => {
              const inner = (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm text-neutral-900 whitespace-pre-line">{row.title}</p>
                    <p className="shrink-0 text-xs font-semibold text-neutral-500">
                      {untilLabel(row.date)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-neutral-400">
                    {row.date}
                    {row.detail ? ` · ${row.detail}` : ""}
                    {row.effort ? ` · ${effortLabel(row.effort)}` : " · renewal"}
                    {row.area === "personal" ? " · personal" : ""}
                  </p>
                </>
              );

              return row.kind === "item" ? (
                <Link key={row.id} href={`/desk/item/${row.id}`} className={`${card} block`}>
                  {inner}
                </Link>
              ) : (
                <Link key={row.id} href="/desk/register" className={`${card} block`}>
                  {inner}
                </Link>
              );
            })}
          </section>
        ))}
    </Screen>
  );
}
