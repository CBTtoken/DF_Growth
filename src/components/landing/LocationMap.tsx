import type { TemplateAnchor } from "@/lib/templates/anchors";
import {
  HEADING_FONT_CLASS,
  EYEBROW_STYLE_CLASS,
  SPACING_CLASS,
  SURFACE_SECTION_CLASS,
  SURFACE_BORDER_CLASS,
  SURFACE_HEADING_CLASS,
  SURFACE_BODY_CLASS,
} from "@/lib/templates/anchors";
import { resolveLocation } from "@/lib/landing/page-copy";

// Server component. Plain query-based Google Maps embed, no API key needed.
//
// Handoff 01 C: the embed used to be built from the street line on its own,
// so live pages were showing maps of "Pretoria", "Scheiding Street" and
// "Shop 28 Upperdeck" — none of which are where the member actually is. The
// query now carries city, province and country, and lib/landing/page-copy.ts
// decides whether there is enough of an address to justify a pin at all.
// Where there is not, the member's area is stated in words instead, because a
// map of the wrong place is worse than no map.
export function LocationMap({
  businessAddress,
  city,
  province,
  accentColor,
  anchor,
}: {
  businessAddress: string | null;
  city?: string | null;
  province?: string | null;
  accentColor: string;
  anchor?: TemplateAnchor;
}) {
  const location = resolveLocation({ businessAddress, city, province });
  if (location.kind === "none") return null;

  const isMap = location.kind === "map";
  const heading = isMap ? "Find us" : "Where we work";
  const eyebrow = isMap ? "Where we are" : "Area served";
  const detail = isMap ? location.displayAddress : location.areaText;
  const src = isMap ? `https://www.google.com/maps?q=${encodeURIComponent(location.query)}&output=embed` : null;

  if (!anchor) {
    return (
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
          <div className={`grid gap-8 ${src ? "md:grid-cols-2 md:items-center md:gap-14" : ""}`}>
            <div>
              <p className="font-mono text-sm font-semibold uppercase tracking-[0.2em] sm:text-base" style={{ color: accentColor }}>
                {eyebrow}
              </p>
              <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl">
                {heading}
              </h2>
              <p className="mt-3 flex items-center gap-2 text-base text-gray-600">
                <span aria-hidden style={{ color: accentColor }}>📍</span>
                {detail}
              </p>
            </div>
            {src && (
              <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
                <iframe
                  title="Business location"
                  src={src}
                  width="100%"
                  height="288"
                  className="grayscale-[0.2]"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  const isDark = anchor.sectionSurface === "dark";

  return (
    <section className={`border-b ${SURFACE_BORDER_CLASS[anchor.sectionSurface]} ${isDark ? SURFACE_SECTION_CLASS.dark : "bg-white"}`}>
      <div className={`mx-auto max-w-5xl px-4 sm:px-8 ${SPACING_CLASS[anchor.spacing]}`}>
        <div className={`grid gap-8 ${src ? "md:grid-cols-2 md:items-center md:gap-14" : ""}`}>
          <div>
            <p className={EYEBROW_STYLE_CLASS[anchor.eyebrowStyle]} style={{ color: accentColor }}>
              {eyebrow}
            </p>
            <h2
              className={`mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl ${SURFACE_HEADING_CLASS[anchor.sectionSurface]} ${HEADING_FONT_CLASS[anchor.headingFont]}`}
            >
              {heading}
            </h2>
            <p className={`mt-3 flex items-center gap-2 text-base ${SURFACE_BODY_CLASS[anchor.sectionSurface]}`}>
              <span aria-hidden style={{ color: accentColor }}>📍</span>
              {detail}
            </p>
          </div>
          {src && (
            <div className={`overflow-hidden rounded-2xl border shadow-sm ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <iframe
                title="Business location"
                src={src}
                width="100%"
                height="288"
                className="grayscale-[0.2]"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
