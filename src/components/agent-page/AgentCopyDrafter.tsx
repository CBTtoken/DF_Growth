"use client";

import { useActionState, useState } from "react";
import { Field, textareaClass, buttonClass, secondaryButtonClass } from "@/components/agent-page/AgentPageFields";

export type AgentCopyIntake = { before: string; why: string; who: string; area: string };
type DrafterState = { error?: string; saved?: boolean } | null;

// Agent Programme Phase 1 Sec 1.6, reframed after real feedback: the four
// questions are an offer, not a step.
//
// Nobody is made to answer them. It sits collapsed behind one line, opened
// only by an agent who wants help writing, and an agent who would rather
// write their own copy, or write nothing at all, never has to open it. The
// page works either way. Forcing four personal questions on someone before
// they can have a page is exactly the kind of thing that makes an agent go
// quiet in week one.
export function AgentCopyDrafter({
  action,
  intake,
  startOpen = false,
}: {
  action: (state: DrafterState, formData: FormData) => Promise<DrafterState>;
  intake: AgentCopyIntake;
  startOpen?: boolean;
}) {
  const hasAnswers = Object.values(intake).some((a) => a.trim().length > 0);
  const [open, setOpen] = useState(startOpen || hasAnswers);
  const [state, formAction, pending] = useActionState(action, null);

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-gray-200 p-5">
        <p className="text-sm text-gray-500">
          Not sure what to write? Answer a few questions and we will write a first draft for you to change.
        </p>
        <button type="button" onClick={() => setOpen(true)} className={secondaryButtonClass}>
          Help me write it
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-5">
      <div>
        <h3 className="text-sm font-bold text-ink">Help me write it</h3>
        <p className="mt-1 text-xs text-gray-500">
          Answer whichever of these you want, in your own words, and skip the rest. Drafting replaces the copy boxes
          above, and you can edit every word of it afterwards.
        </p>
      </div>
      <form action={formAction} className="flex flex-col gap-4">
        <Field label="What did you do before this?">
          <textarea name="before" rows={2} defaultValue={intake.before} className={textareaClass} />
        </Field>
        <Field label="Why did you join?">
          <textarea name="why" rows={2} defaultValue={intake.why} className={textareaClass} />
        </Field>
        <Field label="Who do you most want to help?">
          <textarea name="who" rows={2} defaultValue={intake.who} className={textareaClass} />
        </Field>
        <Field label="What area do you cover?">
          <textarea name="area" rows={2} defaultValue={intake.area} className={textareaClass} />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className={buttonClass}>
            {pending ? "Writing..." : "Write me a draft"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-gray-400">
            Hide this
          </button>
          {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
          {state?.saved && <span className="text-xs text-green-700">Done. The copy boxes above are updated.</span>}
        </div>
      </form>
    </div>
  );
}
