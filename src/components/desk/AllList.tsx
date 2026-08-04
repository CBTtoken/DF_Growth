"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CopyCheck, Trash2 } from "lucide-react";
import {
  bulkFileItems,
  bulkRemoveItems,
  findDuplicates,
  type DuplicateState,
} from "@/app/desk/(app)/actions";
import { card, field, label, quietButton } from "@/components/desk/Shell";
import { checklistLabel, effortLabel, type DeskItem, type DeskSprint } from "@/lib/desk/types";

// The Everything screen's working half, from his feedback note: find a thing
// in a long list, file several things to a sprint or a venture at once, and
// clear out duplicates. This is the screen that keeps the list from becoming
// the sticky-note wall he is afraid of.
export function AllList({
  items,
  sprints,
  ventures,
}: {
  items: DeskItem[];
  sprints: DeskSprint[];
  ventures: string[];
}) {
  const router = useRouter();
  const [, start] = useTransition();

  const [search, setSearch] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [sprintChoice, setSprintChoice] = useState("");
  const [ventureChoice, setVentureChoice] = useState("");

  const openSprints = sprints.filter((s) => s.status !== "shipped");
  const sprintName = useMemo(() => new Map(sprints.map((s) => [s.id, s.name])), [sprints]);

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      [item.title, item.venture ?? "", item.next_action ?? "", item.notes ?? ""]
        .join("\n")
        .toLowerCase()
        .includes(needle)
    );
  }, [items, search]);

  function toggle(id: string) {
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function applyThenClear(work: () => Promise<void>) {
    start(async () => {
      await work();
      setChosen(new Set());
      setSelecting(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          placeholder="Find in the list"
          className={field}
        />
        <button
          type="button"
          onClick={() => {
            setSelecting((s) => !s);
            setChosen(new Set());
          }}
          className={`${quietButton} shrink-0`}
        >
          {selecting ? "Done" : "Select"}
        </button>
      </div>

      {selecting ? (
        <div className={`${card} flex flex-col gap-3`}>
          <p className={label}>
            {chosen.size === 0 ? "Tap items below to pick them up" : `${chosen.size} picked`}
          </p>

          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <select
                value={sprintChoice}
                onChange={(e) => setSprintChoice(e.target.value)}
                className={field}
              >
                <option value="">Send to a sprint...</option>
                <option value="__none__">Take out of its sprint</option>
                {openSprints.map((sprint) => (
                  <option key={sprint.id} value={sprint.id}>
                    {sprint.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={chosen.size === 0 || sprintChoice === ""}
                onClick={() =>
                  applyThenClear(() =>
                    bulkFileItems([...chosen], {
                      sprint_id: sprintChoice === "__none__" ? null : sprintChoice,
                    })
                  )
                }
                className={`${quietButton} shrink-0 disabled:opacity-40`}
              >
                Send
              </button>
            </div>

            <div className="flex gap-2">
              <input
                value={ventureChoice}
                onChange={(e) => setVentureChoice(e.target.value)}
                spellCheck={false}
                list="desk-all-venture-names"
                placeholder="Move to a venture..."
                className={field}
              />
              <datalist id="desk-all-venture-names">
                {ventures.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <button
                type="button"
                disabled={chosen.size === 0 || ventureChoice.trim() === ""}
                onClick={() =>
                  applyThenClear(() => bulkFileItems([...chosen], { venture: ventureChoice }))
                }
                className={`${quietButton} shrink-0 disabled:opacity-40`}
              >
                Move
              </button>
            </div>

            <button
              type="button"
              disabled={chosen.size === 0}
              onClick={() => {
                if (
                  !confirm(
                    `Remove ${chosen.size} ${chosen.size === 1 ? "item" : "items"} completely? ` +
                      "This is for duplicates and things that should never have been on the list. " +
                      "Use Done if the work actually happened."
                  )
                )
                  return;
                applyThenClear(() => bulkRemoveItems([...chosen]));
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 disabled:opacity-40"
            >
              <Trash2 size={14} />
              Remove picked items completely
            </button>
          </div>
        </div>
      ) : null}

      <ul className="flex flex-col gap-2">
        {shown.map((item) => {
          const steps = checklistLabel(item.checklist);
          const meta = [
            item.venture ?? "unfiled",
            effortLabel(item.effort),
            item.blocked_by === "me" ? "on me" : `waiting on ${item.blocked_by}`,
          ];
          if (item.sprint_id && sprintName.has(item.sprint_id))
            meta.push(`sprint: ${sprintName.get(item.sprint_id)}`);
          if (steps) meta.push(steps);
          if (item.status !== "open") meta.push(item.status);

          const body = (
            <>
              <p className="text-sm text-neutral-900 whitespace-pre-line">{item.title}</p>
              <p className="mt-1 text-xs text-neutral-400">{meta.join(" · ")}</p>
            </>
          );

          return (
            <li key={item.id}>
              {selecting ? (
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className={`${card} block w-full text-left ${
                    chosen.has(item.id) ? "border-neutral-900 bg-neutral-50" : ""
                  }`}
                >
                  {body}
                </button>
              ) : (
                <Link href={`/desk/item/${item.id}`} className={`${card} block`}>
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {shown.length === 0 ? (
        <p className="text-sm text-neutral-500">
          {search.trim() ? "Nothing matches that." : "Nothing here."}
        </p>
      ) : null}

      <DuplicateFinder />
    </div>
  );
}

// The duplicate check. It proposes groups; every removal is his tap, and the
// button says exactly what it will do.
function DuplicateFinder() {
  const router = useRouter();
  const [state, run, checking] = useActionState<DuplicateState, FormData>(findDuplicates, null);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [removed, setRemoved] = useState(false);
  const [removing, startRemove] = useTransition();

  return (
    <div className="mt-2 flex flex-col gap-3">
      <form action={run}>
        <button type="submit" disabled={checking} className={`${quietButton} flex w-full items-center justify-center gap-2 py-3`}>
          <CopyCheck size={15} />
          {checking ? "Reading the whole list..." : "Check the open list for duplicates"}
        </button>
      </form>

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state?.groups && state.groups.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Looked at all {state.checked} open items and found no duplicates.
        </p>
      ) : null}
      {removed ? <p className="text-sm text-neutral-500">Removed. The list above is current.</p> : null}

      {state?.groups && state.groups.length > 0 && !removed ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-neutral-500">
            {state.groups.length} possible {state.groups.length === 1 ? "duplicate" : "duplicates"}.
            Tick the copies to remove and keep the one you want. Nothing goes until you say so.
          </p>

          {state.groups.map((group, groupIndex) => (
            <div key={groupIndex} className={`${card} flex flex-col gap-2`}>
              <p className="text-xs text-neutral-400">{group.reason}</p>
              {group.ids.map((id, i) => (
                <label key={id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={ticked.has(id)}
                    onChange={(e) => {
                      setTicked((current) => {
                        const next = new Set(current);
                        if (e.target.checked) next.add(id);
                        else next.delete(id);
                        return next;
                      });
                    }}
                    className="mt-1 size-4 shrink-0"
                  />
                  <span className="whitespace-pre-line text-neutral-900">{group.titles[i]}</span>
                </label>
              ))}
            </div>
          ))}

          <button
            type="button"
            disabled={ticked.size === 0 || removing}
            onClick={() => {
              if (!confirm(`Remove the ${ticked.size} ticked ${ticked.size === 1 ? "item" : "items"} completely?`)) return;
              startRemove(async () => {
                await bulkRemoveItems([...ticked]);
                setRemoved(true);
                setTicked(new Set());
                router.refresh();
              });
            }}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 disabled:opacity-40"
          >
            <Trash2 size={14} />
            Remove the ticked copies
          </button>
        </div>
      ) : null}
    </div>
  );
}
