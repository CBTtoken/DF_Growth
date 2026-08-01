"use client";

import { useActionState, useEffect, useRef } from "react";
import { captureItems } from "@/app/desk/(app)/actions";

// Capture, and nothing else. One box, one button, usable in under five
// seconds with one thumb.
//
// spellcheck is off, autocorrect is off, autocapitalise is off and there is
// no validation beyond "not empty". The operator is dyslexic and types fast:
// a red squiggle in this box would kill the habit the whole tool depends on.
export function DumpForm() {
  const [state, formAction, pending] = useActionState(captureItems, null);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state?.saved) {
      if (boxRef.current) boxRef.current.value = "";
      boxRef.current?.focus();
    }
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <textarea
        ref={boxRef}
        name="dump"
        rows={6}
        autoFocus
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        autoComplete="off"
        data-gramm="false"
        placeholder="What is in your head"
        className="w-full resize-y rounded-2xl border border-neutral-200 bg-white p-4 text-base leading-relaxed outline-none focus:border-neutral-900"
      />

      <button
        type="submit"
        disabled={pending}
        className="rounded-2xl bg-neutral-900 px-4 py-4 text-base font-semibold text-white disabled:opacity-50"
      >
        {pending ? "..." : "Save"}
      </button>

      {state?.saved ? (
        <p className="text-sm text-neutral-500">
          {state.saved === 1 ? "Saved." : `Saved ${state.saved} items.`}
        </p>
      ) : null}
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <p className="text-xs text-neutral-400">
        One line becomes one item. Paste as many as you like.
      </p>
    </form>
  );
}
