"use client";

import { useActionState, useState } from "react";
import { updateTemplate } from "@/app/bizup/actions";
import { TEMPLATES } from "@/lib/bizup/pdf/document";

// Dewald: "I try to change the template and click on save nothing happens."
//
// It was saving correctly the whole time. The action had no return value,
// the page showed no message, and the radio keeps whatever the member
// clicked regardless, so a successful save and a broken one looked exactly
// the same. That is a real bug even though the data was fine.

export function TemplatePicker({ current }: { current: string }) {
  const [state, action, pending] = useActionState(updateTemplate, null);
  const [selected, setSelected] = useState(current);
  const [saved, setSaved] = useState(false);

  return (
    <form
      action={async (fd) => {
        setSaved(false);
        await action(fd);
        setSaved(true);
      }}
      className="flex flex-col gap-3"
    >
      {TEMPLATES.map((t) => (
        <label
          key={t.id}
          className={`flex items-start gap-3 rounded-xl border p-4 text-sm transition ${
            selected === t.id ? "border-brand bg-brand/5" : "border-gray-200 hover:border-brand"
          }`}
        >
          <input
            type="radio"
            name="templateId"
            value={t.id}
            checked={selected === t.id}
            onChange={() => {
              setSelected(t.id);
              setSaved(false);
            }}
            className="mt-1"
          />
          <span>
            <span className="block font-semibold text-ink">{t.name}</span>
            <span className="block text-gray-500">{t.description}</span>
          </span>
        </label>
      ))}

      {state?.error?._form?.[0] && <p className="text-sm text-red-600">{state.error._form[0]}</p>}

      {saved && !state?.error && (
        <p className="text-sm font-medium text-green-700">
          Saved. New documents will use {TEMPLATES.find((t) => t.id === selected)?.name}. Anything
          you have already sent stays as your customer received it.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save template"}
      </button>
    </form>
  );
}
