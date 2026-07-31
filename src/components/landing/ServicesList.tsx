import type { ReactNode } from "react";
import type { TemplateAnchor } from "@/lib/templates/anchors";
import {
  HEADING_FONT_CLASS,
  EYEBROW_STYLE_CLASS,
  SPACING_CLASS,
  CARD_RECIPE_CLASS,
  SURFACE_SECTION_CLASS,
  SURFACE_BORDER_CLASS,
  SURFACE_HEADING_CLASS,
} from "@/lib/templates/anchors";

// Server component. servicesText is stored as plain text, one service per
// line (see src/lib/ai/draft-copy.ts and the Landing Copy step) so it stays
// a normal editable textarea rather than needing a dynamic list-editor UI.
// Handoff 01 F: the heading here used to be the literal string "Everything
// you need, in one place." on every page ever generated, which is the single
// loudest tell that these pages come out of a template. It now comes from the
// caller, derived from the member's own trade or industry, and falls back to
// a plain "Services" rather than to marketing copy.
export function ServicesList({
  servicesText,
  heading = "Services",
  accentColor,
  anchor,
}: {
  servicesText: string | null;
  heading?: string;
  accentColor: string;
  anchor?: TemplateAnchor;
}) {
  const services = (servicesText ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (services.length === 0) return null;

  if (!anchor) {
    return (
      <section id="services" className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
          <p className="font-mono text-sm font-semibold uppercase tracking-[0.2em] sm:text-base" style={{ color: accentColor }}>
            What we offer
          </p>
          <h2 className="mt-3 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl">
            {heading}
          </h2>

          <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {services.map((service, i) => (
              <li
                key={i}
                className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-colors hover:border-current"
                style={{ color: accentColor }}
              >
                <span
                  className="grid size-11 flex-shrink-0 place-items-center rounded-xl text-sm font-bold"
                  style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}
                >
                  ✓
                </span>
                <span className="mt-2.5 text-base font-medium text-gray-700">{service}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  const isDark = anchor.sectionSurface === "dark";
  const headingClass = `${SURFACE_HEADING_CLASS[anchor.sectionSurface]} ${HEADING_FONT_CLASS[anchor.headingFont]}`;
  const cardBg = isDark ? "bg-gray-900" : "bg-white";
  const cardBorder = isDark ? "border-gray-700" : "border-gray-200";
  const layout = anchor.servicesLayout ?? "icon-grid";

  let body: ReactNode;

  if (layout === "numbered-rows") {
    // step-by-step anchor: services read as a sequence, numbered instead of
    // checkmarked — matches this anchor's process-driven storytelling.
    body = (
      <ol className="mt-10 flex flex-col gap-4">
        {services.map((service, i) => (
          <li key={i} className={`flex items-center gap-4 p-5 ${CARD_RECIPE_CLASS[anchor.cardRecipe]}`}>
            <span
              className="grid size-9 flex-shrink-0 place-items-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: accentColor }}
            >
              {i + 1}
            </span>
            <span className={`text-base font-medium ${isDark ? "text-gray-200" : "text-gray-700"}`}>{service}</span>
          </li>
        ))}
      </ol>
    );
  } else if (layout === "spotlight-tiles") {
    // Rebuilt after Dewald looked at /nefeli-property-maintenance and called
    // it what it was. Three separate faults, all visible in one screenshot:
    //
    // 1. `justify-between` inside a `min-h-[8rem]` box pinned the number to
    //    the top and the label to the bottom, so a short service like "Tiling"
    //    sat alone at the foot of a tall empty card. Ten services produced ten
    //    mostly-empty boxes.
    // 2. The 01/02/03 ordinals were the same template tell Handoff 01 F
    //    removed from every section eyebrow, still running here inside the
    //    cards. A business does not number the things it does.
    // 3. The first service got a double-width tile and 20px type purely for
    //    being first. That is arbitrary emphasis on whatever the member
    //    happened to type at the top of a textarea, and it made "Carpentry"
    //    look like the headline act of a general maintenance business.
    //
    // Now a uniform grid that sizes to its content. It still reads differently
    // from icon-grid (no checkmarks, tiles not rows) and checklist-compact
    // (grid not list), which is the point of the layout existing, without
    // inventing hierarchy the data does not have.
    body = (
      <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service, i) => (
          <div key={i} className={`px-5 py-4 ${CARD_RECIPE_CLASS[anchor.cardRecipe]}`}>
            <span
              className={`text-base font-semibold leading-snug ${isDark ? "text-white" : "text-gray-900"}`}
            >
              {service}
            </span>
          </div>
        ))}
      </div>
    );
  } else if (layout === "checklist-compact") {
    // feature-grid / app-dashboard anchors: a dense single-column list
    // rather than a grid of cards — more services readable at a glance,
    // matching those anchors' tighter, more utilitarian spacing.
    body = (
      <ul className={`mt-10 flex flex-col divide-y overflow-hidden rounded-xl border ${cardBorder} divide-gray-200 ${cardBg}`}>
        {services.map((service, i) => (
          <li key={i} className="flex items-center gap-3 px-5 py-3">
            <span className="text-sm font-bold" style={{ color: accentColor }}>
              ✓
            </span>
            <span className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-700"}`}>{service}</span>
          </li>
        ))}
      </ul>
    );
  } else {
    body = (
      <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {services.map((service, i) => (
          <li
            key={i}
            className={`flex items-start gap-4 p-6 transition-colors hover:border-current ${CARD_RECIPE_CLASS[anchor.cardRecipe]}`}
            style={{ color: accentColor }}
          >
            <span
              className="grid size-11 flex-shrink-0 place-items-center rounded-xl text-sm font-bold"
              style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}
            >
              ✓
            </span>
            <span className={`mt-2.5 text-base font-medium ${isDark ? "text-gray-200" : "text-gray-700"}`}>{service}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section id="services" className={`border-b ${SURFACE_BORDER_CLASS[anchor.sectionSurface]} ${isDark ? SURFACE_SECTION_CLASS.dark : "bg-gray-50"}`}>
      <div className={`mx-auto max-w-5xl px-4 sm:px-8 ${SPACING_CLASS[anchor.spacing]}`}>
        <p className={EYEBROW_STYLE_CLASS[anchor.eyebrowStyle]} style={{ color: accentColor }}>
          What we offer
        </p>
        <h2 className={`mt-3 max-w-2xl text-2xl font-bold leading-tight tracking-tight sm:text-3xl ${headingClass}`}>
          {heading}
        </h2>

        {body}
      </div>
    </section>
  );
}
