"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardCheck, FileText, Trash2 } from "lucide-react";
import { draftHandoff, markDone, nudgeItem, removeItem, unblockItem } from "@/app/desk/(app)/actions";
import { card, label, quietButton } from "@/components/desk/Shell";
import { daysLabel, type DeskItem } from "@/lib/desk/types";

// Waiting On. The point of the whole tool: how much of the load is not
// actually his right now.
//
// Unblock and Nudge both change the screen immediately and tell the server
// afterwards. The CC group gets one extra thing: a draft handoff, because
// much of what is in here is work for Claude Code rather than for him.
export function WaitingList({ items }: { items: DeskItem[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [rows, setRows] = useState(items);
  const [nudged, setNudged] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<{ who: string; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [seen, setSeen] = useState(items);
  if (items !== seen) {
    setSeen(items);
    setRows(items);
  }

  const byPerson = new Map<string, DeskItem[]>();
  for (const item of rows) {
    byPerson.set(item.blocked_by, [...(byPerson.get(item.blocked_by) ?? []), item]);
  }

  // Longest wait first, because that is the one that needs a nudge.
  const people = [...byPerson.entries()].sort((a, b) => {
    const oldest = (list: DeskItem[]) =>
      Math.max(...list.map((r) => (r.blocked_since ? Date.parse(r.blocked_since) : Date.now())));
    return oldest(a[1]) - oldest(b[1]);
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-500">
        {rows.length === 0
          ? "Nothing is waiting on anyone else."
          : `${rows.length} of these are not yours to move right now.`}
      </p>

      {people.map(([person, list]) => (
        <div key={person} className={card}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-neutral-900">
              {person === "date" ? "Waiting on a date" : person}
            </p>

            {person.toLowerCase() === "cc" ? (
              <button
                type="button"
                onClick={async () => {
                  const text = await draftHandoff(person);
                  setDraft({ who: person, text });
                  setCopied(false);
                }}
                className="flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600"
              >
                <FileText size={13} />
                Draft handoff
              </button>
            ) : null}
          </div>

          <ul className="mt-3 flex flex-col gap-4">
            {list.map((item) => (
              <li key={item.id} className="flex flex-col gap-2">
                <div>
                  <p className="text-sm text-neutral-900">{item.title}</p>
                  <p className="text-xs text-neutral-400">
                    waiting {daysLabel(nudged.has(item.id) ? new Date().toISOString().slice(0, 10) : item.blocked_since)}
                    {nudged.has(item.id) ? ", nudged" : ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRows((current) => current.filter((r) => r.id !== item.id));
                      startTransition(async () => {
                        await unblockItem(item.id);
                        router.refresh();
                      });
                    }}
                    className={`${quietButton} px-3 py-2 text-xs`}
                  >
                    Back to me
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNudged((current) => new Set(current).add(item.id));
                      startTransition(() => nudgeItem(item.id));
                    }}
                    className={`${quietButton} px-3 py-2 text-xs`}
                  >
                    Nudge sent
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRows((current) => current.filter((r) => r.id !== item.id));
                      startTransition(async () => {
                        await markDone(item.id);
                        router.refresh();
                      });
                    }}
                    className={`${quietButton} px-3 py-2 text-xs`}
                  >
                    Done
                  </button>

                  <Link
                    href={`/desk/item/${item.id}`}
                    className="px-2 py-2 text-xs text-neutral-400 underline"
                  >
                    Edit
                  </Link>

                  {/* An item that should never have been here at all. Not
                      done, not parked, not killed: a mistake. The one rule
                      was written about abandoning work, not about typos. */}
                  <button
                    type="button"
                    aria-label="Remove this item"
                    onClick={() => {
                      if (!confirm("Remove this item completely? Use Done if the work actually happened.")) return;
                      setRows((current) => current.filter((r) => r.id !== item.id));
                      startTransition(async () => {
                        await removeItem(item.id);
                        router.refresh();
                      });
                    }}
                    className="ml-auto px-2 py-2 text-neutral-300 transition-colors hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {draft ? (
        <div className={`${card} flex flex-col gap-3`}>
          <div className="flex items-center justify-between">
            <p className={label}>Handoff draft, {draft.who}</p>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(draft.text);
                setCopied(true);
              }}
              className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white"
            >
              <ClipboardCheck size={13} />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-neutral-50 p-3 text-xs leading-relaxed text-neutral-700">
            {draft.text || "Nothing in that group yet."}
          </pre>
          <p className="text-xs text-neutral-400">
            A draft. The context and the acceptance criteria are still yours to write.
          </p>
        </div>
      ) : null}
    </div>
  );
}
