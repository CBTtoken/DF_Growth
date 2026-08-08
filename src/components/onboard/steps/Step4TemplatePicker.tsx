"use client";

import { useActionState, useEffect, useState } from "react";
import { saveStepTemplate, type OnboardState } from "@/app/onboard/actions";
import { TemplateGallery } from "@/components/templates/TemplateGallery";
import { recommendedTemplateFor } from "@/lib/templates/recommend";

export function Step4TemplatePicker({
  initialTemplate,
  initialIndustry,
  onSuccess,
}: {
  initialTemplate: string;
  // Sprint "Onboarding two doors" item 2: the industry captured back at
  // step 2, used only to preselect a starting point.
  initialIndustry: string;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState<OnboardState, FormData>(saveStepTemplate, null);
  const recommended = recommendedTemplateFor(initialIndustry);
  // A member resuming the wizard keeps whatever they already chose. Only a
  // first visit, with nothing saved yet, starts on the recommendation, and
  // Classic stays the fallback when the trade matches nothing.
  const [selected, setSelected] = useState(initialTemplate || recommended || "conversion");

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">Choose your page style</h2>
        <p className="mt-1 text-sm text-gray-500">
          {recommended
            ? "We've picked the one built for your trade, and it's ready to go. Happy with it? Just continue. If you'd rather browse, every other style is one tap away."
            : "Real previews, not descriptions. Tap one to select it."}{" "}
          They all use your own colors, logo, and the details you give us next. You can change this
          later from your dashboard.
        </p>
      </div>

      <input type="hidden" name="template" value={selected} />

      <TemplateGallery selected={selected} onSelect={setSelected} recommendedId={recommended} />

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
