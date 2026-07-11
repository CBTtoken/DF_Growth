"use client";

import { useActionState, useState } from "react";
import { changeTemplate } from "@/app/dashboard/actions";
import { TemplateGallery } from "@/components/templates/TemplateGallery";

export function ChangeTemplateSection({ currentTemplate }: { currentTemplate: string }) {
  const [state, formAction, pending] = useActionState(changeTemplate, null);
  // No effect auto-closing this on success — the gallery just shows the
  // saved success message in place, and the client can close it themselves
  // whenever they're done, rather than the panel yanking shut on them.
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(currentTemplate);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-ink">Page style</h2>
          <p className="mt-1 text-sm text-gray-500">
            {state?.success ? "Updated — your live page reflects this now." : "Change your page's layout any time."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-300"
        >
          {open ? "Close" : "Change template"}
        </button>
      </div>

      {open && (
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="template" value={selected} />
          <TemplateGallery selected={selected} onSelect={setSelected} />
          {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}
          <button
            type="submit"
            disabled={pending || selected === currentTemplate}
            className="w-fit rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {pending ? "Saving..." : "Save this style"}
          </button>
        </form>
      )}
    </section>
  );
}
