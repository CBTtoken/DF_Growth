import Link from "next/link";
import { listItems, listSprints, listVentures } from "@/lib/desk/queries";
import type { DeskStatus } from "@/lib/desk/types";
import { AllList } from "@/components/desk/AllList";
import { Screen } from "@/components/desk/Shell";

// Everything, filterable and searchable, one tap to the full edit form, and
// the place where several items get filed or removed at once. Not one of the
// main screens: it exists so the whole list stays workable.
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
  const [items, sprints, ventures] = await Promise.all([
    listItems(active === "all" ? undefined : { status: active }),
    listSprints(),
    listVentures(),
  ]);

  const chip = "rounded-full border px-3 py-1.5 text-xs font-semibold";

  return (
    <Screen title="Everything" back={{ href: "/desk/more", label: "More" }}>
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

      <AllList items={items} sprints={sprints} ventures={ventures.map((v) => v.name)} />
    </Screen>
  );
}
