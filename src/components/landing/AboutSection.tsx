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

// Server component, no client JS — same reasoning as TrustBadges. Renders
// nothing if there's no about copy yet (a client who hasn't been through the
// AI-assisted Landing Copy step, or skipped it, shouldn't get a blank box).
export function AboutSection({
  businessName,
  tagline,
  aboutText,
  accentColor,
  eyebrowNumber,
  anchor,
}: {
  businessName: string;
  tagline: string | null;
  aboutText: string | null;
  accentColor: string;
  eyebrowNumber: string;
  anchor?: TemplateAnchor;
}) {
  if (!aboutText) return null;

  // UI/UX Design Pass Part 2: no anchor (Classic Conversion, or any future
  // caller that doesn't pass one) renders today's exact existing markup,
  // untouched — see anchors.ts's own comment for why this is a literal
  // early-return branch rather than a token-interpolated single path.
  if (!anchor) {
    return (
      <section id="about" className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8 sm:py-24">
          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_1.4fr] md:gap-14">
            <div>
              <p className="font-mono text-sm font-semibold uppercase tracking-[0.2em] sm:text-base" style={{ color: accentColor }}>
                {eyebrowNumber} — About
              </p>
              <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl">
                About {businessName}
              </h2>
            </div>
            <div>
              {tagline && <p className="mb-3 text-base font-medium text-gray-500">{tagline}</p>}
              <p className="text-lg leading-relaxed text-gray-600">{aboutText}</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const isDark = anchor.sectionSurface === "dark";

  return (
    <section
      id="about"
      className={`border-b ${SURFACE_BORDER_CLASS[anchor.sectionSurface]} ${isDark ? SURFACE_SECTION_CLASS.dark : "bg-white"}`}
    >
      <div className={`mx-auto max-w-5xl px-4 sm:px-8 ${SPACING_CLASS[anchor.spacing]}`}>
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_1.4fr] md:gap-14">
          <div>
            <p className={EYEBROW_STYLE_CLASS[anchor.eyebrowStyle]} style={{ color: accentColor }}>
              {eyebrowNumber} — About
            </p>
            <h2
              className={`mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl ${SURFACE_HEADING_CLASS[anchor.sectionSurface]} ${HEADING_FONT_CLASS[anchor.headingFont]}`}
            >
              About {businessName}
            </h2>
          </div>
          <div>
            {tagline && (
              <p className={`mb-3 text-base font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>{tagline}</p>
            )}
            <p className={`text-lg leading-relaxed ${SURFACE_BODY_CLASS[anchor.sectionSurface]}`}>{aboutText}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
