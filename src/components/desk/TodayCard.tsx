"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { blockItem, markDone, saveNote, skipItem } from "@/app/desk/(app)/actions";
import { card, field, label, primaryButton, quietButton } from "@/components/desk/Shell";
import { useAutosave } from "@/components/desk/useAutosave";
import { daysLabel, effortLabel, type DeskItem } from "@/lib/desk/types";

// One item. Never a list.
//
// The lag fix lives here. v1 posted a form and waited for a redirect on every
// Done and Skip, so the screen sat still for a second while the server
// thought. Now the next two items come down with the first one, the card
// swaps the instant a button is pressed, and the server call happens behind
// it. The queue is never shown and never scrolls: what is on screen is one
// card, exactly as before.
//
// When the local queue runs dry the router refetches, which is the only
// moment the operator waits, and it happens once every three items instead of
// every one.
export function TodayCard({ items, doneToday }: { items: DeskItem[]; doneToday: DeskItem[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [queue, setQueue] = useState<DeskItem[]>(items);
  const [finished, setFinished] = useState<DeskItem[]>([]);
  const [blocking, setBlocking] = useState(false);
  const [who, setWho] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);

  // The server sends a fresh three whenever the page revalidates. Adopting
  // that list when the local one is empty is what refills the card.
  const [seenIds, setSeenIds] = useState<string>(items.map((i) => i.id).join(","));
  const incoming = items.map((i) => i.id).join(",");
  if (incoming !== seenIds && queue.length === 0) {
    setSeenIds(incoming);
    setQueue(items);
  }

  const item = queue[0];

  function advance() {
    setQueue((rest) => rest.slice(1));
    setBlocking(false);
    setNoteOpen(false);
    setWho("");
    // Refill behind the scenes. The card has already moved on.
    startTransition(() => router.refresh());
  }

  if (!item) {
    return (
      <div className={card}>
        <p className="text-sm text-neutral-500">
          Nothing open in that state. Everything left is either waiting on somebody else, or in one of
          the other two.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className={`${card} flex flex-col gap-4`}>
        <div>
          <p className="text-lg font-semibold leading-snug text-neutral-900 whitespace-pre-line">
            {item.title}
          </p>
          <p className="mt-2 text-sm text-neutral-600">
            {item.next_action ?? "No next action written yet."}
          </p>
          <p className="mt-3 text-xs text-neutral-400">
            {item.venture ?? "unfiled"} &middot; {effortLabel(item.effort)} &middot; open{" "}
            {daysLabel(item.created_at.slice(0, 10))}
            {item.due_date ? ` · due ${item.due_date}` : ""}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              const done = item;
              setFinished((list) => [...list, done]);
              advance();
              startTransition(() => markDone(done.id));
            }}
            className={`${primaryButton} flex-1 py-3 text-sm`}
          >
            Done
          </button>

          <button
            type="button"
            onClick={() => {
              const skipped = item;
              advance();
              startTransition(() => skipItem(skipped.id, skipped.skip_count));
            }}
            className={`${quietButton} flex-1`}
          >
            Skip
          </button>
        </div>

        {blocking ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={who}
              onChange={(e) => setWho(e.target.value)}
              spellCheck={false}
              placeholder="Who is it with"
              className={field}
            />
            <button
              type="button"
              onClick={() => {
                if (!who.trim()) return;
                const blocked = item;
                const name = who;
                advance();
                startTransition(() => blockItem(blocked.id, name));
              }}
              className={quietButton}
            >
              Off
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setBlocking(true)} className={`${quietButton} self-start`}>
            Waiting on someone
          </button>
        )}

        {noteOpen ? (
          <NoteBox id={item.id} initial={item.notes ?? ""} />
        ) : (
          <button
            type="button"
            onClick={() => setNoteOpen(true)}
            className="self-start text-xs font-medium text-neutral-400 underline"
          >
            {item.notes ? "Notes" : "Add a note"}
          </button>
        )}

        <Link href={`/desk/item/${item.id}`} className="text-xs text-neutral-400 underline">
          Edit everything about this
        </Link>
      </div>

      {/* A plain list of what was finished today. No count anywhere else, no
          streak, no score. */}
      {doneToday.length + finished.length > 0 ? (
        <div className={card}>
          <p className={label}>Done today</p>
          <ul className="mt-3 flex flex-col gap-2">
            {[...doneToday, ...finished].map((d) => (
              <li key={d.id} className="text-sm text-neutral-600">
                {d.title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function NoteBox({ id, initial }: { id: string; initial: string }) {
  const { value, setValue, flush } = useAutosave(initial, (next) => saveNote(id, next));

  return (
    <textarea
      autoFocus
      value={value}
      spellCheck={false}
      rows={3}
      placeholder="Anything worth remembering about this"
      onChange={(e) => setValue(e.target.value)}
      onBlur={flush}
      className={field}
    />
  );
}
