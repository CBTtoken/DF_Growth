"use client";

import { useActionState, useEffect, useState } from "react";
import { saveStepTemplate, type OnboardState } from "@/app/onboard/actions";
import { TemplateGallery } from "@/components/templates/TemplateGallery";

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
          Real previews, not descriptions — all ten use your own colors, logo, and the details you
          give us next. Tap one to select it. You can change this later from your dashboard.
        </p>
      </div>

      <input type="hidden" name="template" value={selected} />

      <TemplateGallery selected={selected} onSelect={setSelected} />

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
