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

// Server component, same conditional-eyebrow pattern as the rest of
// src/components/landing/*. Only used by the "Interactive Step-by-Step"
// template (see templateConfig.ts) — generic process copy on purpose
// (no client fills in "how it works" steps anywhere in onboarding), since
// "share your details → get a plan → we deliver" is honestly true of any
// service business rather than a fabricated claim about a specific one.
const steps = [
  { title: "Tell us what you need", desc: "Reach out through the form below. No lengthy questionnaires, just the essentials." },
  { title: "Get a tailored response", desc: "We'll get back to you with next steps, pricing, and a clear idea of timing." },
  { title: "We get it done", desc: "Sit back while we take care of the rest, with updates along the way." },
];

export function HowItWorksSection({
  accentColor,
  eyebrowNumber,
  anchor,
}: {
  accentColor: string;
  eyebrowNumber: string;
  anchor?: TemplateAnchor;
}) {
  if (!anchor) {
    return (
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
          <p className="font-mono text-sm font-semibold uppercase tracking-[0.2em] sm:text-base" style={{ color: accentColor }}>
            {eyebrowNumber} · How it works
          </p>
          <h2 className="mt-3 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl">
            Three simple steps.
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
                <span
                  className="grid size-10 place-items-center rounded-full text-sm font-bold"
                  style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}
                >
                  {i + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const isDark = anchor.sectionSurface === "dark";
  const cardIsDark = anchor.cardRecipe === "dark-panel";

  if (anchor.howItWorksLayout === "jobline") {
    // Fieldwork anchor: the call-out line. One continuous rule runs through
    // all three steps with a filled mono marker at each stop, so the process
    // reads as a single job moving left to right (top to bottom on a phone)
    // rather than three floating cards.
    return (
      <section className={`border-b ${SURFACE_BORDER_CLASS[anchor.sectionSurface]} ${isDark ? SURFACE_SECTION_CLASS.dark : "bg-gray-50"}`}>
        <div className={`mx-auto max-w-5xl px-4 sm:px-8 ${SPACING_CLASS[anchor.spacing]}`}>
          <p className={EYEBROW_STYLE_CLASS[anchor.eyebrowStyle]} style={{ color: accentColor }}>
            {eyebrowNumber} · How a job runs
          </p>
          <h2
            className={`mt-3 max-w-2xl text-2xl font-bold leading-tight tracking-tight sm:text-3xl ${SURFACE_HEADING_CLASS[anchor.sectionSurface]} ${HEADING_FONT_CLASS[anchor.headingFont]}`}
          >
            From first call to job done.
          </h2>

          <ol className="relative mt-12 flex flex-col gap-10 sm:flex-row sm:gap-8">
            {/* The line itself: vertical on a phone, horizontal from sm up. */}
            <span aria-hidden className="absolute left-[1.1rem] top-2 h-[calc(100%-1rem)] w-0.5 sm:left-0 sm:top-[1.1rem] sm:h-0.5 sm:w-full" style={{ backgroundColor: accentColor, opacity: 0.35 }} />
            {steps.map((s, i) => (
              <li key={s.title} className="relative flex flex-1 gap-5 pl-0 sm:flex-col sm:gap-0">
                <span
                  className="relative z-10 grid size-9 flex-shrink-0 place-items-center font-mono text-sm font-bold"
                  style={{ backgroundColor: accentColor, color: "#ffffff" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="sm:mt-5">
                  <h3 className={`text-base font-bold tracking-tight ${SURFACE_HEADING_CLASS[anchor.sectionSurface]} ${HEADING_FONT_CLASS[anchor.headingFont]}`}>
                    {s.title}
                  </h3>
                  <p className={`mt-1.5 text-sm leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  return (
    <section className={`border-b ${SURFACE_BORDER_CLASS[anchor.sectionSurface]} ${isDark ? SURFACE_SECTION_CLASS.dark : "bg-white"}`}>
      <div className={`mx-auto max-w-5xl px-4 sm:px-8 ${SPACING_CLASS[anchor.spacing]}`}>
        <p className={EYEBROW_STYLE_CLASS[anchor.eyebrowStyle]} style={{ color: accentColor }}>
          {eyebrowNumber} · How it works
        </p>
        <h2
          className={`mt-3 max-w-2xl text-2xl font-bold leading-tight tracking-tight sm:text-3xl ${SURFACE_HEADING_CLASS[anchor.sectionSurface]} ${HEADING_FONT_CLASS[anchor.headingFont]}`}
        >
          Three simple steps.
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className={`p-6 ${CARD_RECIPE_CLASS[anchor.cardRecipe]}`}>
              <span
                className="grid size-10 place-items-center rounded-full text-sm font-bold"
                style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}
              >
                {i + 1}
              </span>
              <h3 className={`mt-4 text-base font-semibold ${cardIsDark ? "text-white" : "text-gray-900"}`}>{s.title}</h3>
              <p className={`mt-1.5 text-sm leading-relaxed ${cardIsDark ? "text-gray-300" : "text-gray-600"}`}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
