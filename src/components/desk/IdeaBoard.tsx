"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightCircle, Plus, Trash2 } from "lucide-react";
import { addIdea, deleteIdea, ideaToItem, saveIdea } from "@/app/desk/(app)/actions";
import { card, field, label, quietButton } from "@/components/desk/Shell";
import { useAutosave } from "@/components/desk/useAutosave";
import type { DeskIdea } from "@/lib/desk/types";

// Think. Somewhere to dream without it becoming a task.
//
// Nothing on this screen has a status, a due date, an effort or an owner.
// Nothing counts these, chases them or asks what happened to them. That is
// the entire design: the moment an idea gets a status it starts nagging, and
// a place that nags is not a place you go to think.
//
// The one way out is deliberate. Make it an item copies the idea into the
// list where work lives and leaves the idea sitting here.
export function IdeaBoard({ ideas }: { ideas: DeskIdea[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [board, setBoard] = useState<string>(ideas[0]?.board ?? "Ideas");
  const [adding, setAdding] = useState("");

  const boards = [...new Set(ideas.map((i) => i.board))].sort();
  if (!boards.includes(board)) boards.push(board);

  const visible = ideas.filter((i) => i.board === board);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {boards.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setBoard(name)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              board === name
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 bg-white text-neutral-600"
            }`}
          >
            {name}
          </button>
        ))}

        <NewBoard
          onCreate={(name) => {
            setBoard(name);
            start(async () => {
              await addIdea(name, "");
              router.refresh();
            });
          }}
        />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!adding.trim()) return;
          const heading = adding;
          setAdding("");
          start(async () => {
            await addIdea(board, heading);
            router.refresh();
          });
        }}
        className="flex gap-2"
      >
        <input
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          spellCheck={false}
          placeholder="A thought, a what-if, a maybe"
          className={field}
        />
        <button type="submit" className={quietButton} aria-label="Add">
          <Plus size={18} />
        </button>
      </form>

      {visible.map((idea) => (
        <IdeaCard key={idea.id} idea={idea} boards={boards} />
      ))}

      {visible.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Empty board. Write something badly and come back to it later.
        </p>
      ) : null}
    </div>
  );
}

function NewBoard({ onCreate }: { onCreate: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-dashed border-neutral-300 px-3.5 py-1.5 text-xs font-semibold text-neutral-500"
      >
        New board
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onCreate(name.trim());
        setName("");
        setOpen(false);
      }}
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => setOpen(false)}
        spellCheck={false}
        placeholder="Board name"
        className="rounded-full border border-neutral-300 px-3.5 py-1.5 text-xs outline-none"
      />
    </form>
  );
}

function IdeaCard({ idea, boards }: { idea: DeskIdea; boards: string[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [heading, setHeading] = useState(idea.heading ?? "");
  const [promoted, setPromoted] = useState(Boolean(idea.became_item_id));
  const [gone, setGone] = useState(false);

  // Thinking out loud saves itself, so a half-written idea survives the
  // phone being put down mid-sentence.
  const headingRef = useRef(heading);
  useEffect(() => {
    headingRef.current = heading;
  }, [heading]);
  const { value: body, setValue: setBody, flush } = useAutosave(idea.body ?? "", (next) =>
    saveIdea(idea.id, headingRef.current, next, idea.board)
  );

  if (gone) return null;

  function save() {
    start(() => saveIdea(idea.id, heading, body, idea.board));
  }

  return (
    <div className={`${card} flex flex-col gap-2`}>
      <input
        value={heading}
        onChange={(e) => setHeading(e.target.value)}
        onBlur={save}
        spellCheck={false}
        placeholder="Untitled"
        className="w-full bg-transparent text-base font-semibold text-neutral-900 outline-none"
      />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onBlur={flush}
        spellCheck={false}
        rows={Math.min(12, Math.max(3, body.split("\n").length + 1))}
        placeholder="Think out loud here. Nothing is watching."
        className="w-full resize-y bg-transparent text-sm leading-relaxed text-neutral-700 outline-none"
      />

      <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-2">
        {promoted ? (
          <span className={label}>Already on the list</span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setPromoted(true);
              start(async () => {
                await ideaToItem(idea.id);
                router.refresh();
              });
            }}
            className="flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600"
          >
            <ArrowRightCircle size={13} />
            Make it an item
          </button>
        )}

        {boards.length > 1 ? (
          <select
            value={idea.board}
            onChange={(e) => start(() => saveIdea(idea.id, heading, body, e.target.value))}
            className="rounded-full border border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-600 outline-none"
          >
            {boards.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        ) : null}

        <button
          type="button"
          aria-label="Delete this idea"
          onClick={() => {
            setGone(true);
            start(async () => {
              await deleteIdea(idea.id);
              router.refresh();
            });
          }}
          className="ml-auto text-neutral-300 transition-colors hover:text-red-500"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
