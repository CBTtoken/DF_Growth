import type { ReactNode } from "react";
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

// Server component. A client's own service packages / pricing tiers —
// entirely optional, distinct from ServicesList (a flat list of what they
// do) since packages carry a price and a name a visitor can pick between.
// Renders nothing if the client never filled this in.
type PackageType = "package" | "special" | "discount";
type Package = { name: string; price: string; description: string; type?: PackageType };

// Combined spec Sec 5: the section header reflects what the client actually
// set up, not a fixed "Packages" label regardless of content — a business
// running only Specials shouldn't have its page call them "Packages".
// Undefined type on older data (saved before this field existed) is
// treated as "package", matching the same default used when saving.
function sectionTitle(packages: Package[]): string {
  const types = new Set(packages.map((p) => p.type ?? "package"));
  if (types.size > 1) return "What we offer";
  const [only] = types;
  if (only === "special") return "Specials";
  if (only === "discount") return "Discounts";
  return "Packages";
}

// Combined spec Sec 4: the onboarding field's placeholder hints at typing
// "R350/month" or "From R200", but a client typing a bare number ("550")
// rendered exactly that, no currency symbol at all. Only prepends "R" when
// the price looks like a bare number with no currency or percent sign
// already present — leaves "R350/month", "From R200", or a future Discount
// type's "15% off" (Sec 5) untouched, rather than risking "RR350" or "R15%".
//
// Real bug found live: the original /[R%]/i check matched any letter "r"
// anywhere in the string, not just an actual currency prefix — a price of
// "1,199/year" has an "r" in "year" and silently never got its R prepended.
// /R\d/ specifically checks for R directly followed by a digit (the actual
// currency-prefix shape), so "/year" and "/month" no longer false-trigger it.
function formatPrice(price: string): string {
  const trimmed = price.trim();
  if (/%/.test(trimmed) || /R\d/.test(trimmed) || !/^\d/.test(trimmed)) return trimmed;
  return `R${trimmed}`;
}

export function PackagesSection({
  packages,
  accentColor,
  eyebrowNumber,
  anchor,
}: {
  packages: Package[];
  accentColor: string;
  eyebrowNumber: string;
  anchor?: TemplateAnchor;
}) {
  if (!packages || packages.length === 0) return null;

  // Highlighting the middle option only makes sense with a clear middle —
  // matches the "Most popular" convention already used on Growth's own
  // /pricing page, not something invented for this component alone.
  const highlightIndex = packages.length === 3 ? 1 : -1;
  const title = sectionTitle(packages);

  if (!anchor) {
    return (
      <section id="packages" className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8 sm:py-24">
          <p className="font-mono text-sm font-semibold uppercase tracking-[0.2em] sm:text-base" style={{ color: accentColor }}>
            {eyebrowNumber} — {title}
          </p>
          <h2 className="mt-3 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl">
            Pick what fits you.
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {packages.map((pkg, i) => {
              const highlighted = i === highlightIndex;
              return (
                <div
                  key={i}
                  className={`flex flex-col gap-3 rounded-2xl bg-white p-6 ${
                    highlighted ? "shadow-lg" : "border border-gray-200 shadow-sm"
                  }`}
                  style={highlighted ? { borderWidth: 2, borderStyle: "solid", borderColor: accentColor } : undefined}
                >
                  {highlighted && (
                    <span
                      className="w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
                      style={{ backgroundColor: accentColor }}
                    >
                      Most popular
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                  {pkg.price && <p className="text-xl font-bold" style={{ color: accentColor }}>{formatPrice(pkg.price)}</p>}
                  {pkg.description && <p className="text-sm text-gray-600">{pkg.description}</p>}
                  {/* Combined spec Sec 21: was the shared, client-editable
                      hero ctaLabel (defaulting to "Get Started") — misleading
                      on a package button specifically, since it scrolls to a
                      contact form, not a checkout. Fixed and accurate
                      instead, decoupled from whatever the client set for
                      their hero's own CTA. */}
                  <a
                    href="#lead-form"
                    className="mt-auto rounded-full px-5 py-2.5 text-center text-sm font-semibold shadow-sm transition hover:-translate-y-0.5"
                    style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}
                  >
                    Enquire Now
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  const isDark = anchor.sectionSurface === "dark";
  const cardBg = isDark ? "bg-gray-900" : "bg-white";
  const cardBorder = isDark ? "border-gray-700" : "border-gray-200";
  const headingClass = `${SURFACE_HEADING_CLASS[anchor.sectionSurface]} ${HEADING_FONT_CLASS[anchor.headingFont]}`;
  const bodyClass = SURFACE_BODY_CLASS[anchor.sectionSurface];
  const layout = anchor.packagesLayout ?? "grid-cards";

  const enquireCta = (
    <a
      href="#lead-form"
      className="rounded-full px-5 py-2.5 text-center text-sm font-semibold shadow-sm transition hover:-translate-y-0.5"
      style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}
    >
      Enquire Now
    </a>
  );

  let body: ReactNode;

  if (layout === "list-rows") {
    // feature-grid anchor: dense, scannable rows instead of separate cards
    // — fits the tight-spacing, flat-border aesthetic that anchor otherwise
    // uses everywhere else.
    body = (
      <div className={`mt-10 flex flex-col divide-y overflow-hidden rounded-xl border ${cardBorder} divide-gray-200 ${cardBg}`}>
        {packages.map((pkg, i) => {
          const highlighted = i === highlightIndex;
          return (
            <div key={i} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {highlighted && (
                  <span
                    className="mb-1.5 inline-block w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    Most popular
                  </span>
                )}
                <h3 className={`text-base font-semibold ${headingClass}`}>{pkg.name}</h3>
                {pkg.description && <p className={`mt-1 text-sm ${bodyClass}`}>{pkg.description}</p>}
              </div>
              <div className="flex items-center gap-4">
                {pkg.price && <span className="text-lg font-bold" style={{ color: accentColor }}>{formatPrice(pkg.price)}</span>}
                {enquireCta}
              </div>
            </div>
          );
        })}
      </div>
    );
  } else if (layout === "spotlight-feature") {
    // multi-product anchor: one package (the highlighted one, or the first
    // if none is) gets real visual weight instead of three equal boxes —
    // matches this anchor's "one flagship offering, others secondary" feel.
    const spotlightIndex = highlightIndex !== -1 ? highlightIndex : 0;
    const spotlight = packages[spotlightIndex];
    const rest = packages.filter((_, i) => i !== spotlightIndex);
    body = (
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-start">
        <div
          className={`flex flex-col gap-4 rounded-2xl p-8 shadow-lg lg:col-span-3 ${cardBg}`}
          style={{ borderWidth: 2, borderStyle: "solid", borderColor: accentColor }}
        >
          <span
            className="w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
            style={{ backgroundColor: accentColor }}
          >
            Featured
          </span>
          <h3 className={`text-2xl font-semibold ${headingClass}`}>{spotlight.name}</h3>
          {spotlight.price && (
            <p className="text-3xl font-bold" style={{ color: accentColor }}>
              {formatPrice(spotlight.price)}
            </p>
          )}
          {spotlight.description && <p className={`text-base ${bodyClass}`}>{spotlight.description}</p>}
          <div className="mt-2 w-fit">{enquireCta}</div>
        </div>
        <div className="flex flex-col gap-4 lg:col-span-2">
          {rest.map((pkg, i) => (
            <div key={i} className={`flex flex-col gap-2 rounded-xl border ${cardBorder} ${cardBg} p-5`}>
              <h3 className={`text-base font-semibold ${headingClass}`}>{pkg.name}</h3>
              {pkg.price && <p className="text-lg font-bold" style={{ color: accentColor }}>{formatPrice(pkg.price)}</p>}
              {pkg.description && <p className={`text-sm ${bodyClass}`}>{pkg.description}</p>}
              <div className="mt-1 w-fit">{enquireCta}</div>
            </div>
          ))}
        </div>
      </div>
    );
  } else {
    body = (
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {packages.map((pkg, i) => {
          const highlighted = i === highlightIndex;
          return (
            <div
              key={i}
              className={`flex flex-col gap-3 rounded-2xl p-6 ${cardBg} ${
                highlighted ? "shadow-lg" : `border ${cardBorder} shadow-sm`
              }`}
              style={highlighted ? { borderWidth: 2, borderStyle: "solid", borderColor: accentColor } : undefined}
            >
              {highlighted && (
                <span
                  className="w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  Most popular
                </span>
              )}
              <h3 className={`text-lg font-semibold ${headingClass}`}>{pkg.name}</h3>
              {pkg.price && <p className="text-xl font-bold" style={{ color: accentColor }}>{formatPrice(pkg.price)}</p>}
              {pkg.description && <p className={`text-sm ${bodyClass}`}>{pkg.description}</p>}
              <div className="mt-auto w-full">{enquireCta}</div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <section id="packages" className={`border-b ${SURFACE_BORDER_CLASS[anchor.sectionSurface]} ${isDark ? SURFACE_SECTION_CLASS.dark : "bg-gray-50"}`}>
      <div className={`mx-auto max-w-5xl px-4 sm:px-8 ${SPACING_CLASS[anchor.spacing]}`}>
        <p className={EYEBROW_STYLE_CLASS[anchor.eyebrowStyle]} style={{ color: accentColor }}>
          {eyebrowNumber} — {title}
        </p>
        <h2 className={`mt-3 max-w-2xl text-2xl font-bold leading-tight tracking-tight sm:text-3xl ${headingClass}`}>
          Pick what fits you.
        </h2>

        {body}
      </div>
    </section>
  );
}
