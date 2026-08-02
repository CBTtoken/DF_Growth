"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { addGoAwayNote, deleteGoAwayNote, saveGoAwayNote } from "@/app/desk/(app)/actions";
import { card, field, quietButton } from "@/components/desk/Shell";
import { useAutosave } from "@/components/desk/useAutosave";
import type { DeskNote } from "@/lib/desk/types";

// The go-away section. Plain words, for the people who will need them.
//
// Free text under headings he names himself. Nothing structured, nothing
// clever, and deliberately no field for a password, a key or a recovery code.
// Where the login lives is a pointer in the Register, in plain words. What
// unlocks it is not here and never will be.
export function GoAwayDoc({ notes }: { notes: DeskNote[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [adding, setAdding] = useState("");

  return (
    <div className="flex flex-col gap-4">
      {notes.map((note) => (
        <Section key={note.id} note={note} />
      ))}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!adding.trim()) return;
          const heading = adding;
          setAdding("");
          start(async () => {
            await addGoAwayNote(heading);
            router.refresh();
          });
        }}
        className="flex gap-2"
      >
        <input
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          spellCheck={false}
          placeholder="Another heading, in your words"
          className={field}
        />
        <button type="submit" className={quietButton} aria-label="Add section">
          <Plus size={18} />
        </button>
      </form>

      <p className="text-xs leading-relaxed text-neutral-400">
        No passwords, keys or recovery codes go in here, or anywhere in The Desk. This tool has no
        zero-knowledge encryption and it shares a database with member data, so a flaw in a private
        tool would become somebody else&apos;s breach. Say where the login lives, not what it is.
      </p>
    </div>
  );
}

function Section({ note }: { note: DeskNote }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [heading, setHeading] = useState(note.heading);
  const [gone, setGone] = useState(false);

  // The body saves itself: shortly after typing stops, on blur, and when the
  // screen goes away. Losing a paragraph of this document because a phone
  // switched apps would be the worst kind of bug this tool could have.
  const headingRef = useRef(heading);
  useEffect(() => {
    headingRef.current = heading;
  }, [heading]);

  const {
    value: body,
    setValue: setBody,
    flush,
  } = useAutosave(note.body ?? "", (next) => saveGoAwayNote(note.id, headingRef.current, next));

  if (gone) return null;

  function save() {
    start(() => saveGoAwayNote(note.id, heading, body));
  }

  return (
    <div className={`${card} flex flex-col gap-2`}>
      <div className="flex items-center gap-2">
        <input
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          onBlur={save}
          spellCheck={false}
          className="flex-1 bg-transparent text-base font-semibold text-neutral-900 outline-none"
        />
        <button
          type="button"
          aria-label="Remove this section"
          onClick={() => {
            setGone(true);
            start(async () => {
              await deleteGoAwayNote(note.id);
              router.refresh();
            });
          }}
          className="text-neutral-300 transition-colors hover:text-red-500"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onBlur={flush}
        spellCheck={false}
        rows={Math.min(20, Math.max(4, body.split("\n").length + 2))}
        placeholder="Write it as you would say it."
        className="w-full resize-y bg-transparent text-sm leading-relaxed text-neutral-700 outline-none"
      />
    </div>
  );
}
