"use client";

import { useState, useTransition } from "react";
import { saveVenture } from "@/app/desk/(app)/actions";
import { field, label, quietButton } from "@/components/desk/Shell";
import type { DeskStream } from "@/lib/desk/types";

// What done looks like for this venture.
//
// The draft in the box was written from his own items so the field is not
// staring at him empty, but it is a draft and the screen says so. Everything
// here is his to rewrite.
export function EndStateForm({
  name,
  endState,
  stream,
}: {
  name: string;
  endState: string;
  stream: DeskStream;
}) {
  const [value, setValue] = useState(endState);
  const [which, setWhich] = useState<DeskStream>(stream);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <span className={label}>What done looks like</span>
      <textarea
        value={value}
        rows={3}
        spellCheck={false}
        placeholder="When is this thing finished, or good enough to leave alone?"
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        className={field}
      />

      <div className="flex items-center gap-2">
        <select
          value={which}
          onChange={(e) => {
            setWhich(e.target.value as DeskStream);
            setSaved(false);
          }}
          className={`${field} w-auto py-2 text-sm`}
        >
          <option value="own">mine</option>
          <option value="client">client</option>
          <option value="life">life</option>
        </select>

        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await saveVenture(name, value, which);
              setSaved(true);
            })
          }
          className={quietButton}
        >
          {pending ? "..." : "Save"}
        </button>

        {saved ? <span className="text-xs text-neutral-400">Saved</span> : null}
      </div>
    </div>
  );
}
