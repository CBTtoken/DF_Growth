"use client";

import { useActionState, useEffect, useRef } from "react";
import { captureItems } from "@/app/desk/(app)/actions";
import { field, primaryButton } from "@/components/desk/Shell";

// Capture, and nothing else. One box, one button, usable in under five
// seconds with one thumb.
//
// spellcheck is off, autocorrect is off, autocapitalise is off and there is
// no validation beyond "not empty". The operator is dyslexic and types fast:
// a red squiggle in this box would kill the habit the whole tool depends on.
//
// The box only clears once the server has confirmed the save. If it fails the
// words are still there.
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
        rows={7}
        autoFocus
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        autoComplete="off"
        data-gramm="false"
        placeholder="What is in your head"
        className={`${field} resize-y leading-relaxed`}
      />

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "..." : "Save"}
      </button>

      {state?.saved ? (
        <p className="text-sm text-neutral-500">
          {state.saved === 1 ? "Saved." : `Saved ${state.saved} items.`}
        </p>
      ) : null}
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <p className="text-xs leading-relaxed text-neutral-400">
        Write as much as you like. A blank line starts a new item, so a paragraph stays one thought. A
        line that starts with a dash or a number also starts a new one, so a pasted list stays a list.
      </p>
    </form>
  );
}
