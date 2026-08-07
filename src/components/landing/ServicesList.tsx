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
export function ServicesList({
  servicesText,
  accentColor,
  eyebrowNumber,
  anchor,
}: {
  servicesText: string | null;
  accentColor: string;
  eyebrowNumber: string;
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
            {eyebrowNumber} · What we offer
          </p>
          <h2 className="mt-3 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl">
            Everything you need, in one place.
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

  if (layout === "menu-board") {
    // Kasi Kitchen anchor: the menu as a chalkboard — the page's single
    // dark band (the coverage-panel precedent: fixed dark colours here
    // regardless of the anchor's light section surface). The flame strip
    // along the top is the theme's fixed material signature, the way
    // steel-plate fixes steel and copper-seam fixes copper. Items read as
    // menu lines in chalk white over dotted rules; the member's own
    // accent colour carries the ticket and the markers.
    return (
      <section id="services" className="border-b border-gray-900 bg-[#211a14]">
        <div
          aria-hidden
          className="h-1.5 w-full"
          style={{ background: "linear-gradient(90deg, #ff8a00, #ff3d00 45%, #ffb400)" }}
        />
        <div className={`mx-auto max-w-5xl px-4 sm:px-8 ${SPACING_CLASS[anchor.spacing]}`}>
          <p className={EYEBROW_STYLE_CLASS[anchor.eyebrowStyle]} style={{ color: accentColor }}>
            {eyebrowNumber} · The menu
          </p>
          <h2 className={`mt-4 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl ${HEADING_FONT_CLASS[anchor.headingFont]}`}>
            What&apos;s cooking.
          </h2>
          <ul className="mt-8 grid gap-x-14 sm:grid-cols-2">
            {services.map((service, i) => (
              <li
                key={i}
                className="flex items-baseline gap-3.5 border-b border-dotted border-white/20 py-4"
              >
                <span aria-hidden className="size-2 shrink-0 rotate-45" style={{ backgroundColor: accentColor }} />
                <span className="text-base font-semibold leading-snug text-[#f6efe4] sm:text-lg">{service}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm leading-relaxed text-white/60">
            WhatsApp us with what you feel like and we will tell you what is fresh today.
          </p>
        </div>
      </section>
    );
  }

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
    // Dark Mode pilot rebuild: an asymmetric grid instead of a uniform
    // card grid — the first service gets real visual weight (a wider
    // tile, bigger type), the rest sit as smaller supporting tiles.
    body = (
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {services.map((service, i) => {
          const isFirst = i === 0;
          return (
            <div
              key={i}
              className={`flex flex-col justify-between gap-6 p-6 ${CARD_RECIPE_CLASS[anchor.cardRecipe]} ${
                isFirst ? "col-span-2 min-h-[10rem]" : "col-span-1 min-h-[8rem]"
              }`}
            >
              <span className="font-mono text-xs" style={{ color: accentColor }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={`font-semibold leading-snug ${isFirst ? "text-xl" : "text-sm"} ${isDark ? "text-white" : "text-gray-900"}`}
              >
                {service}
              </span>
            </div>
          );
        })}
      </div>
    );
  } else if (layout === "work-index") {
    // Fieldwork anchor: the services ledger. Not cards at all — full-width
    // rule-separated rows with an oversized mono index and headline-weight
    // type, the way a capability list reads on a contractor's spec sheet.
    // Odd rows indent on desktop so the column of indices staggers, which
    // keeps a long list from reading as a table.
    // Reworked twice on Dewald's live review (3 Aug): the staggered
    // single-column ledger with display-font rows read messy and over the
    // top at real page width. Now a calm two-column index at reading
    // weight — the mono number carries the ledger feel, the row text is
    // ordinary body type, and every row aligns the same way.
    body = (
      <ol className="mt-10 grid gap-x-14 border-t border-gray-300 sm:grid-cols-2">
        {services.map((service, i) => (
          <li key={i} className="flex items-baseline gap-4 border-b border-gray-200 py-4 sm:py-5">
            <span className="font-mono text-base font-semibold tabular-nums sm:text-lg" style={{ color: accentColor }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className={`text-base font-medium leading-snug sm:text-lg ${isDark ? "text-gray-200" : "text-gray-800"}`}>
              {service}
            </span>
          </li>
        ))}
      </ol>
    );
  } else if (layout === "junction-line") {
    // Copperline anchor: the services are junctions on a pipe run — one
    // vertical line in the member's own colour with a ring fitting at each
    // service. The line is the theme's structural signature and it costs
    // nothing on a slow connection: two borders and a set of dots.
    body = (
      <ol className="relative mt-10 ml-1.5 max-w-2xl border-l-[3px] pb-1" style={{ borderColor: `${accentColor}66` }}>
        {services.map((service, i) => (
          <li key={i} className="relative pl-8 pb-6 last:pb-0">
            <span
              aria-hidden
              className="absolute -left-[10.5px] top-1 size-[18px] rounded-full border-[4px] bg-white"
              style={{ borderColor: accentColor }}
            />
            <span className={`text-base font-semibold leading-snug sm:text-lg ${isDark ? "text-gray-200" : "text-gray-800"}`}>
              {service}
            </span>
          </li>
        ))}
      </ol>
    );
  } else if (layout === "amenity-pills") {
    // Retreat anchor: facilities read as a loose wrap of quiet pills rather
    // than a checklist or a job sheet — right for a guest house, where
    // "WiFi, pool, braai area" is a glance, not a services pitch.
    body = (
      <ul className="mt-10 flex flex-wrap gap-3">
        {services.map((service, i) => (
          <li
            key={i}
            className={`px-5 py-2.5 text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-700"} ${CARD_RECIPE_CLASS[anchor.cardRecipe]}`}
          >
            {service}
          </li>
        ))}
      </ul>
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
          {eyebrowNumber} ·{" "}
          {layout === "work-index"
            ? "Scope of work"
            : layout === "junction-line"
              ? "What we do"
              : layout === "amenity-pills"
                ? "Facilities"
                : "What we offer"}
        </p>
        <h2 className={`mt-3 max-w-2xl text-2xl font-bold leading-tight tracking-tight sm:text-3xl ${headingClass}`}>
          {layout === "work-index"
            ? "The work we take on."
            : layout === "junction-line"
              ? "Call us for any of this."
              : layout === "amenity-pills"
                ? "Everything on site."
                : "Everything you need, in one place."}
        </h2>

        {body}
      </div>
    </section>
  );
}
