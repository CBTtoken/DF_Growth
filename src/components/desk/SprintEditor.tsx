"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, PackageCheck, Send, Trash2 } from "lucide-react";
import {
  deleteSprint,
  handOverSprint,
  saveSprint,
  setSprintItems,
  shipSprint,
} from "@/app/desk/(app)/actions";
import { useAutosave } from "@/components/desk/useAutosave";
import { card, field, label, primaryButton, quietButton } from "@/components/desk/Shell";
import type { DeskItem, DeskSprint } from "@/lib/desk/types";

// One sprint: what it is for, what is in it, and the button that turns it
// into a brief.
//
// The three states matter in this order. Collecting, while he ticks things
// off the pool. Handed, at which point the items become CC's and leave his
// own list, so his Today stops offering him work he has already delegated.
// Shipped, when it comes back, which is the one moment a batch of items is
// closed together.
export function SprintEditor({
  sprint,
  inSprint,
  candidates,
  brief,
}: {
  sprint: DeskSprint;
  inSprint: DeskItem[];
  candidates: DeskItem[];
  brief: string;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [picking, setPicking] = useState(false);
  const [chosen, setChosen] = useState<Set<string>>(new Set(inSprint.map((i) => i.id)));
  const [copied, setCopied] = useState(false);

  const goal = useAutosave(sprint.goal ?? "", (next) => saveSprint(sprint.id, { goal: next }));
  const context = useAutosave(sprint.context ?? "", (next) => saveSprint(sprint.id, { context: next }));

  const handed = sprint.status === "handed";
  const shipped = sprint.status === "shipped";

  const pool = [...inSprint, ...candidates].sort((a, b) =>
    (a.venture ?? "").localeCompare(b.venture ?? "")
  );

  return (
    <div className="flex flex-col gap-5">
      <div className={`${card} flex flex-col gap-3`}>
        <div className="flex flex-col gap-1">
          <span className={label}>What this sprint is for</span>
          <textarea
            value={goal.value}
            onChange={(e) => goal.setValue(e.target.value)}
            onBlur={goal.flush}
            rows={3}
            spellCheck={false}
            placeholder="One paragraph. Why this batch, and what it should change."
            className={field}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className={label}>Anything the build needs to know</span>
          <textarea
            value={context.value}
            onChange={(e) => context.setValue(e.target.value)}
            onBlur={context.flush}
            rows={3}
            spellCheck={false}
            placeholder="Decisions already made, things not to touch, constraints."
            className={field}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className={label}>
            In this sprint, {inSprint.length}
          </p>
          {!shipped ? (
            <button
              type="button"
              onClick={() => setPicking((p) => !p)}
              className="text-xs font-semibold text-neutral-600 underline"
            >
              {picking ? "Done picking" : "Pick items"}
            </button>
          ) : null}
        </div>

        {picking ? (
          <div className={`${card} flex max-h-96 flex-col gap-2 overflow-auto`}>
            {pool.map((item) => (
              <label key={item.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={chosen.has(item.id)}
                  onChange={(e) => {
                    setChosen((current) => {
                      const next = new Set(current);
                      if (e.target.checked) next.add(item.id);
                      else next.delete(item.id);
                      return next;
                    });
                  }}
                  className="mt-1 size-4 shrink-0"
                />
                <span>
                  <span className="text-neutral-900">{item.title.split("\n")[0]}</span>
                  <span className="block text-xs text-neutral-400">{item.venture ?? "unfiled"}</span>
                </span>
              </label>
            ))}

            <button
              type="button"
              onClick={() => {
                setPicking(false);
                start(async () => {
                  await setSprintItems(sprint.id, [...chosen]);
                  router.refresh();
                });
              }}
              className={`${quietButton} sticky bottom-0`}
            >
              Save what is in it
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {inSprint.map((item) => (
              <div key={item.id} className={card}>
                <p className="text-sm text-neutral-900">{item.title.split("\n")[0]}</p>
                <p className="mt-1 text-xs text-neutral-400">
                  {item.venture ?? "unfiled"}
                  {item.next_action ? ` · ${item.next_action}` : " · no next step written"}
                </p>
              </div>
            ))}
            {inSprint.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Nothing in it yet. Pick items, or send something here from any item screen.
              </p>
            ) : null}
          </div>
        )}
      </div>

      {inSprint.length > 0 ? (
        <div className={`${card} flex flex-col gap-3`}>
          <div className="flex items-center justify-between">
            <p className={label}>The brief</p>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(brief);
                setCopied(true);
              }}
              className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white"
            >
              <ClipboardCheck size={13} />
              {copied ? "Copied" : "Copy the brief"}
            </button>
          </div>

          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-neutral-50 p-3 text-xs leading-relaxed text-neutral-700">
            {brief}
          </pre>

          <p className="text-xs leading-relaxed text-neutral-400">
            Open a new Claude Code session in the DigitalFlyer Growth folder, paste this, and it is
            enough to start from. Write the acceptance criteria first if you can: it is the part that
            decides whether what comes back is right.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!handed && !shipped && inSprint.length > 0 ? (
          <button
            type="button"
            onClick={() =>
              start(async () => {
                await handOverSprint(sprint.id);
                router.refresh();
              })
            }
            className={`${primaryButton} flex items-center gap-2 py-3 text-sm`}
          >
            <Send size={15} />
            Hand it to CC
          </button>
        ) : null}

        {handed ? (
          <button
            type="button"
            onClick={() =>
              start(async () => {
                await shipSprint(sprint.id);
                router.refresh();
              })
            }
            className={`${primaryButton} flex items-center gap-2 py-3 text-sm`}
          >
            <PackageCheck size={15} />
            It shipped, close everything in it
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => {
            if (!confirm("Delete this sprint? The items in it stay, they just go back to the list.")) return;
            start(async () => {
              await deleteSprint(sprint.id);
              router.push("/desk/sprints");
            });
          }}
          className="ml-auto flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs text-neutral-400"
        >
          <Trash2 size={14} />
          Delete sprint
        </button>
      </div>

      {handed ? (
        <p className="text-sm text-neutral-500">
          Handed over {sprint.handed_at?.slice(0, 10)}. These items now sit under CC on Waiting, so
          you can see how long they have been there.
        </p>
      ) : null}
    </div>
  );
}
