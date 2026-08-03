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
type PackageType = "package" | "special" | "discount" | "event";
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
  // Added for the first done-for-you build, and general rather than
  // specific to it: a member who runs events had nowhere to list them
  // except a section headed "Packages", which is not what a wine tasting
  // is. The "price" column carries the date for these, which is why the
  // editor relabels that field when Event is picked.
  if (only === "event") return "Upcoming events";
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

/**
 * Splits "9 August" into a date chip.
 *
 * The events layout leads on the date rather than a price, so it wants the
 * number and the month apart. Anything that is not a plain date, "Every
 * first Tuesday" for instance, comes back whole and is printed as written.
 */
function splitDate(value: string): { lead: string; rest: string } | null {
  const m = value.trim().match(/^(\d{1,2})\s+(.+)$/);
  return m ? { lead: m[1], rest: m[2] } : null;
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

  // Events get their own rendering entirely, not a package card with the
  // date squeezed into the price slot. That version shipped and it was
  // wrong in two ways at once: the price formatter turned "9 August" into
  // "R9 August", and the middle card picked up a "Most popular" badge,
  // which on a list of three evenings is both meaningless and a claim
  // nobody made. The house rule against invented social proof is absolute,
  // and an automatic badge is exactly that.
  const isEvents = packages.every((p) => p.type === "event");
  if (isEvents) {
    return (
      <EventsSection packages={packages} accentColor={accentColor} eyebrowNumber={eyebrowNumber} anchor={anchor} />
    );
  }

  if (!anchor) {
    return (
      <section id="packages" className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
          <p className="font-mono text-sm font-semibold uppercase tracking-[0.2em] sm:text-base" style={{ color: accentColor }}>
            {eyebrowNumber} · {title}
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
  } else if (layout === "ambient-stack") {
    // Dark Mode pilot rebuild: full-width stacked rows with a glowing
    // left-edge accent bar in the client's own color, instead of a 3-col
    // grid — fits the "premium, one clear path" feel this anchor is going
    // for, and reads better against a dark surface than boxed cards do.
    body = (
      <div className="mt-10 flex flex-col gap-4">
        {packages.map((pkg, i) => {
          const highlighted = i === highlightIndex;
          return (
            <div
              key={i}
              className={`relative flex flex-col gap-3 overflow-hidden rounded-xl p-6 pl-8 sm:flex-row sm:items-center sm:justify-between ${cardBg} border ${cardBorder}`}
            >
              <div
                aria-hidden
                className="absolute inset-y-0 left-0 w-1"
                style={{ backgroundColor: accentColor, boxShadow: highlighted ? `0 0 16px ${accentColor}` : undefined }}
              />
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
                {pkg.price && (
                  <span className="text-2xl font-bold" style={{ color: accentColor }}>
                    {formatPrice(pkg.price)}
                  </span>
                )}
                {enquireCta}
              </div>
            </div>
          );
        })}
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
          {eyebrowNumber} · {title}
        </p>
        <h2 className={`mt-3 max-w-2xl text-2xl font-bold leading-tight tracking-tight sm:text-3xl ${headingClass}`}>
          Pick what fits you.
        </h2>

        {body}
      </div>
    </section>
  );
}

/**
 * A diary, not a price list.
 *
 * Dewald, 3 August, on the first version: the cards "does not look really
 * great" and the section read like every other template. He was right, and
 * the reason is that events were being poured into a layout built for
 * packages, which leads on price, ranks options against each other and
 * badges a winner. None of those apply to a wine tasting.
 *
 * So this leads on the date, in a chip you can read at a glance from a
 * phone, with the evening's name beside it and one quiet way to ask about
 * it. No prices, no ranking, no badges, and no "pick what fits you", because
 * a visitor is not choosing between these, they are checking whether they
 * are free on the night.
 */
function EventsSection({
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
  const isDark = anchor?.sectionSurface === "dark";
  const headingClass = anchor
    ? `${SURFACE_HEADING_CLASS[anchor.sectionSurface]} ${HEADING_FONT_CLASS[anchor.headingFont]}`
    : "text-gray-900";
  const bodyClass = anchor ? SURFACE_BODY_CLASS[anchor.sectionSurface] : "text-gray-600";

  return (
    <section
      id="packages"
      className={`border-b ${anchor ? SURFACE_BORDER_CLASS[anchor.sectionSurface] : "border-gray-100"} ${
        isDark ? SURFACE_SECTION_CLASS.dark : "bg-white"
      }`}
    >
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-8 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p
              className={anchor ? EYEBROW_STYLE_CLASS[anchor.eyebrowStyle] : "font-mono text-sm font-semibold uppercase tracking-[0.2em]"}
              style={{ color: accentColor }}
            >
              {eyebrowNumber} · Upcoming events
            </p>
            <h2 className={`mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl ${headingClass}`}>
              Come and meet the group.
            </h2>
          </div>
          <a
            href="#lead-form"
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5"
            style={{ backgroundColor: accentColor }}
          >
            Ask about an evening
          </a>
        </div>

        <ul className="mt-8 flex flex-col">
          {packages.map((event, i) => {
            const date = splitDate(event.price ?? "");
            return (
              <li
                key={`${event.name}-${i}`}
                className={`flex items-start gap-4 py-5 sm:gap-6 ${
                  i > 0 ? `border-t ${isDark ? "border-gray-800" : "border-gray-200"}` : ""
                }`}
              >
                {/* The date as a chip, because a diary is scanned down the
                    left edge rather than read line by line. */}
                <span
                  className="flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl text-center leading-none sm:size-[4.5rem]"
                  style={{ backgroundColor: `${accentColor}1f`, color: accentColor }}
                >
                  {date ? (
                    <>
                      <span className="text-xl font-extrabold sm:text-2xl">{date.lead}</span>
                      <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide">{date.rest}</span>
                    </>
                  ) : (
                    <span className="px-1 text-[10px] font-semibold uppercase tracking-wide">
                      {event.price || "Soon"}
                    </span>
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className={`text-base font-semibold sm:text-lg ${headingClass}`}>{event.name}</p>
                  {event.description && (
                    <p className={`mt-1 text-sm leading-relaxed ${bodyClass}`}>{event.description}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
