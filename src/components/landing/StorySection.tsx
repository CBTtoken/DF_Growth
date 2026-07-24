import type { TemplateAnchor } from "@/lib/templates/anchors";
import {
  HEADING_FONT_CLASS,
  EYEBROW_STYLE_CLASS,
  SPACING_CLASS,
  SURFACE_SECTION_CLASS,
  SURFACE_BORDER_CLASS,
  SURFACE_BODY_CLASS,
} from "@/lib/templates/anchors";

// Server component, no client JS. Distinct from AboutSection on purpose:
// aboutText is AI-drafted from the business's facts and can lightly
// paraphrase them away (a founding year or "family owned" mentioned in the
// client's own notes isn't guaranteed to survive AI summarization). This
// renders additional_notes completely verbatim — nothing the client
// specifically wrote can get lost or reworded here.
export function StorySection({
  storyText,
  accentColor,
  eyebrowNumber,
  anchor,
}: {
  storyText: string | null;
  accentColor: string;
  eyebrowNumber: string;
  anchor?: TemplateAnchor;
}) {
  if (!storyText) return null;

  if (!anchor) {
    return (
      <section id="story" className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-8 sm:py-24">
          <p className="font-mono text-sm font-semibold uppercase tracking-[0.2em] sm:text-base" style={{ color: accentColor }}>
            {eyebrowNumber} — Our story
          </p>
          <p className="mt-4 whitespace-pre-line text-lg leading-relaxed text-gray-600">{storyText}</p>
        </div>
      </section>
    );
  }

  // This is long-form body prose, not a heading — a display or mono
  // headline font (used for feature-grid/dark-mode/vibrant-geo/
  // app-dashboard's actual headings elsewhere) would hurt paragraph
  // readability here. The serif is the one font choice genuinely built
  // for long-form reading, so it's the only one applied to body copy —
  // storyteller's whole point ("real typographic personality, long-form
  // reading rhythm") lands specifically here, on the prose itself.
  const bodyFontClass = anchor.headingFont === "serif-editorial" ? HEADING_FONT_CLASS[anchor.headingFont] : "";
  const isDark = anchor.sectionSurface === "dark";

  return (
    <section
      id="story"
      className={`border-b ${SURFACE_BORDER_CLASS[anchor.sectionSurface]} ${isDark ? SURFACE_SECTION_CLASS.dark : "bg-gray-50"}`}
    >
      <div className={`mx-auto max-w-3xl px-4 sm:px-8 ${SPACING_CLASS[anchor.spacing]}`}>
        <p className={EYEBROW_STYLE_CLASS[anchor.eyebrowStyle]} style={{ color: accentColor }}>
          {eyebrowNumber} — Our story
        </p>
        <p className={`mt-4 whitespace-pre-line text-lg leading-relaxed ${SURFACE_BODY_CLASS[anchor.sectionSurface]} ${bodyFontClass}`}>
          {storyText}
        </p>
      </div>
    </section>
  );
}
