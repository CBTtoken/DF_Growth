import type { ReactNode } from "react";
import type { TemplateAnchor } from "@/lib/templates/anchors";
import {
  HEADING_FONT_CLASS,
  EYEBROW_STYLE_CLASS,
  SPACING_CLASS,
  CARD_RECIPE_CLASS,
  SURFACE_SECTION_CLASS,
  SURFACE_BORDER_CLASS,
} from "@/lib/templates/anchors";

type Testimonial = {
  id: string;
  author_name: string;
  quote: string;
  rating: number | null;
};

// CLAUDE.md Section 7 rule 2: trust elements live next to the CTA, not
// buried in a footer. Server component — a horizontally-scrollable strip
// needs no JS to be a "slider", keeping the hero/trust section non-blocking.
export function TrustBadges({
  testimonials,
  accentColor,
  eyebrowNumber,
  anchor,
}: {
  testimonials: Testimonial[];
  accentColor: string;
  eyebrowNumber: string;
  anchor?: TemplateAnchor;
}) {
  // Combined spec Sec 2: this "Secure payment via Paystack" badge used to
  // render unconditionally here, right below Packages on every client page
  // — but a client page has no actual Paystack checkout connected to
  // Packages (they only scroll to the contact form, see Sec 3), so the
  // badge referenced a capability that doesn't exist there. It's accurate
  // on the main DigitalFlyer site itself (real subscription billing does
  // run through Paystack) — moved to SiteFooter.tsx instead, not removed
  // outright.
  if (!anchor) {
    return (
      <section className="border-b border-gray-100 bg-white">
        {testimonials.length > 0 && (
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8 sm:py-24">
            <p className="font-mono text-sm font-semibold uppercase tracking-[0.2em] sm:text-base" style={{ color: accentColor }}>
              {eyebrowNumber} — What people say
            </p>
            <div className="mt-10 flex w-full gap-4 overflow-x-auto pb-2">
              {testimonials.map((t) => (
                <blockquote
                  key={t.id}
                  className="min-w-[280px] flex-shrink-0 rounded-2xl border border-gray-100 bg-gray-50 p-6 text-sm shadow-sm"
                >
                  <p className="text-gray-700">&ldquo;{t.quote}&rdquo;</p>
                  <footer className="mt-3 flex items-center justify-between text-gray-500">
                    <span>— {t.author_name}</span>
                    {t.rating && <span style={{ color: accentColor }}>{"★".repeat(t.rating)}</span>}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  }

  const isDark = anchor.sectionSurface === "dark";
  const layout = anchor.trustLayout ?? "strip";

  let body: ReactNode = null;

  if (testimonials.length > 0) {
    if (layout === "spotlight-quote") {
      // Dark Mode pilot rebuild: reviews lead the page for this anchor, so
      // they get real weight — large alternating-aligned quote blocks
      // instead of a horizontally-scrolled card strip.
      body = (
        <div className="mt-10 flex flex-col gap-12">
          {testimonials.map((t, i) => (
            <blockquote
              key={t.id}
              className={`flex max-w-2xl flex-col gap-4 ${i % 2 === 1 ? "items-end self-end text-right" : "items-start text-left"}`}
            >
              <span aria-hidden className="text-6xl font-black leading-none" style={{ color: `${accentColor}55` }}>
                &ldquo;
              </span>
              <p
                className={`text-xl font-medium leading-relaxed sm:text-2xl ${HEADING_FONT_CLASS[anchor.headingFont]} ${isDark ? "text-white" : "text-gray-900"}`}
              >
                {t.quote}
              </p>
              <footer className={`flex items-center gap-3 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                <span className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{t.author_name}</span>
                {t.rating && <span style={{ color: accentColor }}>{"★".repeat(t.rating)}</span>}
              </footer>
            </blockquote>
          ))}
        </div>
      );
    } else {
      body = (
        <div className="mt-10 flex w-full gap-4 overflow-x-auto pb-2">
          {testimonials.map((t) => (
            <blockquote
              key={t.id}
              className={`min-w-[280px] flex-shrink-0 p-6 text-sm ${CARD_RECIPE_CLASS[anchor.cardRecipe]}`}
            >
              <p className={anchor.cardRecipe === "dark-panel" ? "text-gray-200" : "text-gray-700"}>
                &ldquo;{t.quote}&rdquo;
              </p>
              <footer
                className={`mt-3 flex items-center justify-between ${
                  anchor.cardRecipe === "dark-panel" ? "text-gray-400" : "text-gray-500"
                }`}
              >
                <span className={HEADING_FONT_CLASS[anchor.headingFont]}>— {t.author_name}</span>
                {t.rating && <span style={{ color: accentColor }}>{"★".repeat(t.rating)}</span>}
              </footer>
            </blockquote>
          ))}
        </div>
      );
    }
  }

  return (
    <section
      id="trust"
      className={`border-b ${SURFACE_BORDER_CLASS[anchor.sectionSurface]} ${isDark ? SURFACE_SECTION_CLASS.dark : "bg-white"}`}
    >
      {testimonials.length > 0 && (
        <div className={`mx-auto max-w-5xl px-4 sm:px-8 ${SPACING_CLASS[anchor.spacing]}`}>
          <p className={EYEBROW_STYLE_CLASS[anchor.eyebrowStyle]} style={{ color: accentColor }}>
            {eyebrowNumber} — What people say
          </p>
          {body}
        </div>
      )}
    </section>
  );
}
