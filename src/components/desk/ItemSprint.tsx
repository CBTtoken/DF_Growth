"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Trash2 } from "lucide-react";
import { addToSprint, removeItem } from "@/app/desk/(app)/actions";
import { card, field, label } from "@/components/desk/Shell";
import type { DeskSprint } from "@/lib/desk/types";

// The two things the item screen was missing.
//
// Send it to a sprint, which is how something noticed while testing or asked
// for by a client becomes a build rather than another line on a list. And
// remove it, for the item that should never have existed: not done, not
// parked, not killed, just wrong.
export function ItemSprint({
  itemId,
  sprintId,
  sprints,
}: {
  itemId: string;
  sprintId: string | null;
  sprints: DeskSprint[];
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [current, setCurrent] = useState(sprintId ?? "");
  const [saved, setSaved] = useState(false);

  const open = sprints.filter((s) => s.status !== "shipped");

  return (
    <div className={`${card} flex flex-col gap-3`}>
      <div className="flex flex-col gap-1">
        <span className={label}>Is this a build for CC?</span>
        <div className="flex items-center gap-2">
          <select
            value={current}
            onChange={(e) => {
              const next = e.target.value;
              setCurrent(next);
              setSaved(false);
              start(async () => {
                await addToSprint(itemId, next || null);
                setSaved(true);
                router.refresh();
              });
            }}
            className={field}
          >
            <option value="">Not in a sprint</option>
            {open.map((sprint) => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.name}
              </option>
            ))}
          </select>
          {saved ? <Send size={15} className="shrink-0 text-neutral-400" /> : null}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          if (!confirm("Remove this item completely? Use Done if the work actually happened.")) return;
          start(async () => {
            await removeItem(itemId);
            router.push("/desk/all");
          });
        }}
        className="flex items-center gap-1.5 self-start text-xs font-medium text-neutral-400"
      >
        <Trash2 size={14} />
        Remove this item completely
      </button>
    </div>
  );
}
