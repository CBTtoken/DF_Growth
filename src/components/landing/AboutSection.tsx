import Image from "next/image";
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
  photoUrl,
}: {
  businessName: string;
  tagline: string | null;
  aboutText: string | null;
  accentColor: string;
  eyebrowNumber: string;
  anchor?: TemplateAnchor;
  /** Only consumed by the "statement" layout; other layouts ignore it. */
  photoUrl?: string | null;
}) {
  if (!aboutText) return null;

  // UI/UX Design Pass Part 2: no anchor (Classic Conversion, or any future
  // caller that doesn't pass one) renders today's exact existing markup,
  // untouched — see anchors.ts's own comment for why this is a literal
  // early-return branch rather than a token-interpolated single path.
  if (!anchor) {
    return (
      <section id="about" className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_1.4fr] md:gap-14">
            <div>
              <p className="font-mono text-sm font-semibold uppercase tracking-[0.2em] sm:text-base" style={{ color: accentColor }}>
                {eyebrowNumber} · About
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

  if (anchor.aboutLayout === "statement") {
    // Fieldwork anchor, reworked on Dewald's live review (3 Aug): the first
    // cut set the whole paragraph in display type at pull-quote scale and
    // read as a wall of bold. Now the pitch sits at reading weight behind
    // the accent rule, with a work photo beside it in a plate-labelled
    // frame — the visitor sees the problem being sorted while they read.
    // No photo supplied simply means the text takes the full measure.
    return (
      <section
        id="about"
        className={`border-b ${SURFACE_BORDER_CLASS[anchor.sectionSurface]} ${isDark ? SURFACE_SECTION_CLASS.dark : "bg-white"}`}
      >
        <div className={`mx-auto max-w-5xl px-4 sm:px-8 ${SPACING_CLASS[anchor.spacing]}`}>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <p className={EYEBROW_STYLE_CLASS[anchor.eyebrowStyle]} style={{ color: accentColor }}>
              {eyebrowNumber} · {anchor.id === "kasi-kitchen" ? "Who is cooking" : "Who you are dealing with"}
            </p>
          </div>
          <div className={`mt-8 grid gap-10 ${photoUrl ? "md:grid-cols-[1.05fr_0.95fr] md:items-center" : ""}`}>
            <div className="border-l-[6px] pl-6 sm:pl-8" style={{ borderColor: accentColor }}>
              {tagline && (
                <p
                  className={`mb-4 text-lg font-semibold tracking-tight sm:text-xl ${SURFACE_HEADING_CLASS[anchor.sectionSurface]} ${HEADING_FONT_CLASS[anchor.headingFont]}`}
                >
                  {tagline}
                </p>
              )}
              <p className={`max-w-2xl text-base leading-relaxed sm:text-lg ${SURFACE_BODY_CLASS[anchor.sectionSurface]}`}>
                {aboutText}
              </p>
              <p className="mt-6 flex items-center gap-2.5 font-mono text-xs font-bold uppercase tracking-[0.28em]" style={{ color: accentColor }}>
                <span aria-hidden className="inline-block h-0.5 w-8" style={{ backgroundColor: accentColor }} />
                {businessName}
              </p>
            </div>
            {photoUrl && (
              <figure>
                <div className={`relative aspect-[4/3] w-full overflow-hidden border ${isDark ? "border-gray-700" : "border-gray-300"}`}>
                  <Image
                    src={photoUrl}
                    alt={`${businessName} at work`}
                    fill
                    sizes="(max-width: 768px) 90vw, 40vw"
                    className="object-cover"
                  />
                </div>
                <figcaption
                  className="mt-1.5 font-mono text-[0.6rem] font-bold uppercase tracking-[0.25em]"
                  style={{ color: accentColor }}
                >
                  {/* Same per-anchor wording pattern as the lookbook heading:
                      a kitchen's photo is a plate, not a site visit. */}
                  {anchor.id === "kasi-kitchen" ? "From our kitchen" : "On site"}
                </figcaption>
              </figure>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="about"
      className={`border-b ${SURFACE_BORDER_CLASS[anchor.sectionSurface]} ${isDark ? SURFACE_SECTION_CLASS.dark : "bg-white"}`}
    >
      <div className={`mx-auto max-w-5xl px-4 sm:px-8 ${SPACING_CLASS[anchor.spacing]}`}>
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_1.4fr] md:gap-14">
          <div>
            <p className={EYEBROW_STYLE_CLASS[anchor.eyebrowStyle]} style={{ color: accentColor }}>
              {eyebrowNumber} · About
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
