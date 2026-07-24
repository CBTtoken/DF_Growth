"use client";

import { useActionState, useState } from "react";
import { changeAssetStyle } from "@/app/dashboard/actions";
import { ASSET_STYLES } from "@/lib/assets/styles";
import { Card } from "@/components/ui/Card";

// Real, live-rendered previews (/api/og/preview/[style], sample data) so a
// client sees an actual generated image before choosing, same "see it,
// don't read about it" pattern as the landing-page template picker. This
// only sets the default for FUTURE testimonial images, existing ones keep
// whatever style they were made with.
export function AssetStyleSection({ currentStyle }: { currentStyle: string }) {
  const [state, formAction, pending] = useActionState(changeAssetStyle, null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(currentStyle);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-ink">Social asset style</h2>
          <p className="mt-1 text-sm text-gray-500">
            {state?.success
              ? "Saved, new images will use this style."
              : "How your generated social images look — testimonials and everything below."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-300"
        >
          {open ? "Close" : "Change style"}
        </button>
      </div>

      {open && (
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="style" value={selected} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ASSET_STYLES.map((s) => {
              const isSelected = selected === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelected(s.id)}
                  className={`flex flex-col overflow-hidden rounded-2xl border-2 text-left transition-colors ${
                    isSelected ? "border-brand" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="relative aspect-square overflow-hidden bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element -- a generated OG image, not a static asset next/image can optimize meaningfully */}
                    <img src={`/api/og/preview/${s.id}`} alt={`${s.name} preview`} className="h-full w-full object-cover" />
                    {isSelected && (
                      <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-brand text-[10px] font-bold text-white shadow">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 border-t border-gray-100 bg-white px-2.5 py-2">
                    <p className="text-xs font-semibold leading-snug text-gray-900">{s.name}</p>
                  </div>
                </button>
              );
            })}
          </div>
          {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}
          <button
            type="submit"
            disabled={pending || selected === currentStyle}
            className="w-fit rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {pending ? "Saving..." : "Save this style"}
          </button>
        </form>
      )}
    </Card>
  );
}
