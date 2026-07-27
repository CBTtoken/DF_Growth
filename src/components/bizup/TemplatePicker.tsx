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

// The free tier gets one template, per Sec 2 and the published pricing
// table. The other four are shown but locked rather than hidden, so the
// upgrade has something concrete attached to it rather than being an
// abstract price difference.
const FREE_TEMPLATE_ID = "clean";

export function TemplatePicker({
  current,
  allTemplates = true,
}: {
  current: string;
  allTemplates?: boolean;
}) {
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
      {TEMPLATES.map((t) => {
        const locked = !allTemplates && t.id !== FREE_TEMPLATE_ID;
        return (
        <label
          key={t.id}
          className={`flex items-start gap-3 rounded-xl border p-4 text-sm transition ${
            locked
              ? "cursor-not-allowed border-gray-200 opacity-60"
              : selected === t.id
                ? "border-brand bg-brand/5"
                : "border-gray-200 hover:border-brand"
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
            disabled={locked}
          />
          <span>
            <span className="block font-semibold text-ink">
              {t.name}
              {locked && <span className="ml-2 font-normal text-gray-400">R49 plan</span>}
            </span>
            <span className="block text-gray-500">{t.description}</span>
          </span>
        </label>
        );
      })}

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
