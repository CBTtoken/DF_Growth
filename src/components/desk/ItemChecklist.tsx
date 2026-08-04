"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { saveChecklist } from "@/app/desk/(app)/actions";
import { card, label } from "@/components/desk/Shell";
import type { DeskChecklistStep } from "@/lib/desk/types";

// Steps inside one item, from his feedback note: one CC task with five
// questions was five stickies before this. The screen updates itself first
// and the server reconciles behind, the same bargain as Today.
//
// Ticking every step does not close the item. Done stays a decision he
// takes, not a side effect he discovers.
export function ItemChecklist({ itemId, checklist }: { itemId: string; checklist: DeskChecklistStep[] }) {
  const [steps, setSteps] = useState<DeskChecklistStep[]>(checklist);
  const [draft, setDraft] = useState("");
  const [, start] = useTransition();

  function commit(next: DeskChecklistStep[]) {
    setSteps(next);
    start(async () => {
      await saveChecklist(itemId, next);
    });
  }

  function addDraft() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    commit([...steps, { text, done: false }]);
  }

  const doneCount = steps.filter((step) => step.done).length;

  return (
    <div className={`${card} flex flex-col gap-3`}>
      <div className="flex items-baseline justify-between">
        <span className={label}>Steps</span>
        {steps.length > 0 ? (
          <span className="text-xs text-neutral-400">
            {doneCount} of {steps.length} done
          </span>
        ) : null}
      </div>

      {steps.map((step, index) => (
        <div key={index} className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={step.done}
            onChange={(e) =>
              commit(steps.map((s, i) => (i === index ? { ...s, done: e.target.checked } : s)))
            }
            className="mt-1 size-4 shrink-0"
          />
          <span
            className={`flex-1 text-sm whitespace-pre-line ${
              step.done ? "text-neutral-400 line-through" : "text-neutral-900"
            }`}
          >
            {step.text}
          </span>
          <button
            type="button"
            aria-label="Remove this step"
            onClick={() => commit(steps.filter((_, i) => i !== index))}
            className="mt-0.5 shrink-0 text-neutral-300"
          >
            <X size={14} />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addDraft();
            }
          }}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          placeholder={steps.length === 0 ? "Break this into steps if it is really several things" : "Another step"}
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
        <button
          type="button"
          aria-label="Add step"
          onClick={addDraft}
          className="shrink-0 rounded-lg border border-neutral-300 p-2 text-neutral-600"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
