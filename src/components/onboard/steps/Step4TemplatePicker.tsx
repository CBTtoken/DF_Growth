"use client";

import { useActionState, useEffect, useState } from "react";
import { saveStepTemplate, type OnboardState } from "@/app/onboard/actions";
import { templates } from "@/lib/templates/registry";

// "Classic Conversion" isn't in the templates registry (it's the original
// hand-built layout, not one of the 10 new archetypes) — represented here
// only, as the literal "conversion" sentinel value templateSchema accepts.
const CLASSIC = {
  id: "conversion" as const,
  name: "Classic Conversion",
  archetype: "The original DigitalFlyer Growth layout",
  description: "Clean, numbered sections built around a single strong call to action.",
};

export function Step4TemplatePicker({
  initialTemplate,
  onSuccess,
}: {
  initialTemplate: string;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState<OnboardState, FormData>(saveStepTemplate, null);
  const [selected, setSelected] = useState(initialTemplate || "conversion");

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">Choose your page style</h2>
        <p className="mt-1 text-sm text-gray-500">
          All ten use your own colors, logo, and the details you give us next — pick whichever
          layout fits how you want to be found. You can change this later from your dashboard.
        </p>
      </div>

      <input type="hidden" name="template" value={selected} />

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setSelected("conversion")}
          className={`rounded-xl border px-4 py-3.5 text-left text-sm transition-colors ${
            selected === "conversion" ? "border-brand bg-brand/5" : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <span className="font-semibold text-gray-900">{CLASSIC.name}</span>
          <span className="block text-xs text-gray-500">{CLASSIC.description}</span>
        </button>

        {templates.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelected(t.id)}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition-colors ${
                selected === t.id ? "border-brand bg-brand/5" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Icon className="mt-0.5 size-4 flex-shrink-0 text-gray-400" aria-hidden />
              <span>
                <span className="block font-semibold text-gray-900">{t.name}</span>
                <span className="block text-xs text-gray-500">{t.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      {state?.error?.template && <p className="text-xs text-red-600">{state.error.template[0]}</p>}
      {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {pending ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}
