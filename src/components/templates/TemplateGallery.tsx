"use client";

import { useState } from "react";
import { templates } from "@/lib/templates/registry";

const CLASSIC = {
  id: "conversion" as const,
  name: "Classic Conversion",
  description: "Clean, numbered sections built around a single strong call to action.",
};

export const TEMPLATE_OPTIONS = [CLASSIC, ...templates.map((t) => ({ id: t.id, name: t.name, description: t.description }))];

type TemplateOption = { id: string; name: string; description: string };

const PREVIEW_WIDTH = 1200;
const PREVIEW_HEIGHT = 760;

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
function TemplateCard({
  option,
  isSelected,
  onSelect,
}: {
  option: TemplateOption;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(option.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(option.id);
        }
      }}
      className={`flex shrink-0 cursor-pointer flex-col overflow-hidden rounded-2xl border-2 text-left transition-colors ${
        isSelected ? "border-brand" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      {/* Combined spec Sec 8: without shrink-0 here and on the wrapper
          above, these cards are flex items with Tailwind's default
          flex-shrink:1 inside the scrollable list — once the cards'
          combined height exceeds its max height, the browser squeezes
          every card down to a ~33px sliver instead of letting the list
          scroll, collapsing the preview to nothing and clipping the text.
          That was the real cause of the "misaligned, off-center" report. */}
      <div
        className="relative w-full shrink-0 overflow-hidden bg-gray-50 [container-type:inline-size]"
        style={{ aspectRatio: `${PREVIEW_WIDTH} / ${PREVIEW_HEIGHT}` }}
      >
        <iframe
          src={`/preview/${option.id}`}
          title={`${option.name} preview`}
          loading="lazy"
          tabIndex={-1}
          style={{
            width: PREVIEW_WIDTH,
            height: PREVIEW_HEIGHT,
            // Combined spec Sec 9: scales to the card's real rendered width
            // via CSS container query units rather than a fixed constant,
            // which clipped badly on mobile.
            transform: `scale(calc(100cqw / ${PREVIEW_WIDTH}px))`,
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
        <p className="text-sm font-semibold leading-snug text-gray-900">{option.name}</p>
        <p className="text-xs leading-relaxed text-gray-500">{option.description}</p>
      </div>
    </div>
  );
}

export function TemplateGallery({
  selected,
  onSelect,
  recommendedId,
}: {
  selected: string;
  onSelect: (id: string) => void;
  // Sprint "Onboarding two doors" item 2: the template matched to the
  // member's trade (lib/templates/recommend.ts).
  recommendedId?: string | null;
}) {
  const recommended = recommendedId ? TEMPLATE_OPTIONS.find((t) => t.id === recommendedId) : null;
  // Everything else keeps its existing order, Classic included.
  const others = recommended ? TEMPLATE_OPTIONS.filter((t) => t.id !== recommended.id) : TEMPLATE_OPTIONS;
  // Open from the start when there is nothing to recommend, which is also
  // how the dashboard's "Change template" uses this component: it passes no
  // recommendation, so it keeps exactly the flat list it always had.
  const [showOthers, setShowOthers] = useState(!recommended);

  if (!recommended) {
    return (
      <div className="flex max-h-[480px] flex-col gap-3 overflow-y-auto pr-1">
        {others.map((t) => (
          <TemplateCard key={t.id} option={t} isSelected={selected === t.id} onSelect={onSelect} />
        ))}
      </div>
    );
  }

  // Dewald, 8 August 2026: "make the We Recommend more prominent on the top
  // of the suggested template." A badge beside the name was too quiet, and
  // twenty options in a scrolling box is a decision nobody asked to make.
  //
  // So the recommendation is not an item in a list any more, it is the
  // answer: full width, its own banner above it, already selected. The rest
  // fold away behind one tap. This is the interface standard's
  // progressive-disclosure rule, "show the common thing, hide the rare
  // thing", applied to the step where most members were defaulting to
  // Classic simply because it was first.
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border-2 border-brand">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-brand px-4 py-2.5">
          <span className="text-xs font-bold uppercase tracking-wide text-white">
            We recommend this for your trade
          </span>
          {selected === recommended.id && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Selected
            </span>
          )}
        </div>
        <TemplateCard
          option={recommended}
          isSelected={selected === recommended.id}
          onSelect={onSelect}
        />
      </div>

      {!showOthers ? (
        <button
          type="button"
          onClick={() => setShowOthers(true)}
          className="self-start text-sm font-semibold text-brand underline-offset-2 hover:underline"
        >
          Happy with this one? Just continue. Or show the other {others.length} styles
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-ink">All the other styles</p>
          <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-1">
            {others.map((t) => (
              <TemplateCard key={t.id} option={t} isSelected={selected === t.id} onSelect={onSelect} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
