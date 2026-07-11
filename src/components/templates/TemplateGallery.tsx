"use client";

import { templates } from "@/lib/templates/registry";

const CLASSIC = {
  id: "conversion" as const,
  name: "Classic Conversion",
  description: "Clean, numbered sections built around a single strong call to action.",
};

export const TEMPLATE_OPTIONS = [CLASSIC, ...templates.map((t) => ({ id: t.id, name: t.name, description: t.description }))];

const PREVIEW_WIDTH = 1200;
const PREVIEW_HEIGHT = 760;
const SCALE = 0.36;

// Shared by the onboarding picker (Step4TemplatePicker) and the dashboard's
// "Change template" — real, live-rendered previews (src/app/preview/
// [templateId]) at small scale rather than a text description or a static
// screenshot, so a non-technical client can actually see what they're
// choosing, and the preview can never drift out of sync with the template.
//
// Found via real UAT (mobile): the whole card used to be a <button>
// wrapping the <iframe>, which is invalid HTML — a <button> can't contain
// "interactive content" like an iframe. Desktop Chrome quietly tolerates
// this; mobile Safari does not, and was silently dropping the iframe
// entirely, leaving only the text row (exactly what showed up in
// testing: a list of text pills with no preview image at all). Now a
// plain div with a click/keyboard handler instead of a real button.
export function TemplateGallery({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex max-h-[480px] flex-col gap-3 overflow-y-auto pr-1">
      {TEMPLATE_OPTIONS.map((t) => {
        const isSelected = selected === t.id;
        return (
          <div
            key={t.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(t.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(t.id);
              }
            }}
            className={`flex cursor-pointer flex-col overflow-hidden rounded-2xl border-2 text-left transition-colors ${
              isSelected ? "border-brand" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="relative overflow-hidden bg-gray-50" style={{ height: PREVIEW_HEIGHT * SCALE }}>
              <iframe
                src={`/preview/${t.id}`}
                title={`${t.name} preview`}
                loading="lazy"
                tabIndex={-1}
                style={{
                  width: PREVIEW_WIDTH,
                  height: PREVIEW_HEIGHT,
                  transform: `scale(${SCALE})`,
                  transformOrigin: "top left",
                  pointerEvents: "none",
                  border: 0,
                }}
              />
              {isSelected && (
                <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-brand text-xs font-bold text-white shadow">
                  ✓
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1 border-t border-gray-100 bg-white px-4 py-3.5">
              <p className="text-sm font-semibold leading-snug text-gray-900">{t.name}</p>
              <p className="text-xs leading-relaxed text-gray-500">{t.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
