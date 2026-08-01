import Link from "next/link";
import { listItems } from "@/lib/desk/queries";
import type { DeskStatus } from "@/lib/desk/types";

// Everything, filterable, one tap to the full edit form. Not one of the four
// screens: it exists so that every field of every item is reachable, which
// matters most while the seed data is still being corrected.
export const dynamic = "force-dynamic";

const FILTERS: { key: DeskStatus | "all"; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "parked", label: "Parked" },
  { key: "done", label: "Done" },
  { key: "killed", label: "Killed" },
  { key: "all", label: "Everything" },
];

export default async function DeskAllPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const active = FILTERS.find((f) => f.key === status)?.key ?? "open";

  const items = await listItems(active === "all" ? undefined : { status: active });

  const chip = "rounded-full border px-3 py-1.5 text-xs font-semibold";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-5">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/desk/all?status=${f.key}`}
            className={`${chip} ${
              active === f.key
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 bg-white text-neutral-600"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`/desk/item/${item.id}`}
              className="block rounded-2xl border border-neutral-200 bg-white p-4"
            >
              <p className="text-sm">{item.title}</p>
              <p className="mt-1 text-xs text-neutral-400">
                {item.venture ?? "unfiled"} &middot; {item.effort} &middot;{" "}
                {item.blocked_by === "me" ? "on me" : `waiting on ${item.blocked_by}`}
                {item.status !== "open" ? ` · ${item.status}` : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {items.length === 0 ? <p className="text-sm text-neutral-500">Nothing here.</p> : null}
    </div>
  );
}
