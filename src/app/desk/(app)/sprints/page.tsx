import Link from "next/link";
import { PackagePlus } from "lucide-react";
import { createSprint } from "@/app/desk/(app)/actions";
import { listSprints, sprintSizes } from "@/lib/desk/queries";
import { Screen, card, field, label, quietButton } from "@/components/desk/Shell";

// Sprints. Where a thought becomes a build.
//
// The gap this fills, in his words: something comes up while testing, or a
// client asks for a change, and it is work for Claude Code rather than for
// him. Before this there was nowhere to put it except the same list as
// everything else.
export const dynamic = "force-dynamic";

const STATUS_WORDS: Record<string, string> = {
  draft: "collecting",
  ready: "brief written",
  handed: "with CC",
  shipped: "shipped",
};

export default async function DeskSprintsPage() {
  const [sprints, sizes] = await Promise.all([listSprints(), sprintSizes()]);

  const live = sprints.filter((s) => s.status !== "shipped");
  const done = sprints.filter((s) => s.status === "shipped");

  async function create(formData: FormData) {
    "use server";
    await createSprint(String(formData.get("name") ?? ""));
  }

  return (
    <Screen
      title="Sprints"
      subtitle="Work bundled up and handed to CC, with a brief attached."
      back={{ href: "/desk/more", label: "More" }}
    >
      <form action={create} className="flex gap-2">
        <input name="name" placeholder="Name a new sprint" spellCheck={false} className={field} required />
        <button type="submit" className={quietButton} aria-label="Create sprint">
          <PackagePlus size={18} />
        </button>
      </form>

      {live.map((sprint) => (
        <Link key={sprint.id} href={`/desk/sprints/${sprint.id}`} className={`${card} block`}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-semibold text-neutral-900">{sprint.name}</p>
            <p className="shrink-0 text-xs text-neutral-500">{STATUS_WORDS[sprint.status]}</p>
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {sizes.get(sprint.id) ?? 0} {(sizes.get(sprint.id) ?? 0) === 1 ? "item" : "items"}
          </p>
          {sprint.goal ? (
            <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{sprint.goal}</p>
          ) : (
            <p className="mt-2 text-sm italic text-neutral-400">No goal written yet.</p>
          )}
        </Link>
      ))}

      {done.length > 0 ? (
        <>
          <p className={label}>Shipped</p>
          {done.map((sprint) => (
            <Link
              key={sprint.id}
              href={`/desk/sprints/${sprint.id}`}
              className={`${card} block opacity-60`}
            >
              <p className="text-sm font-semibold text-neutral-900">{sprint.name}</p>
              <p className="text-xs text-neutral-500">
                shipped {sprint.shipped_at?.slice(0, 10) ?? ""}
              </p>
            </Link>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
