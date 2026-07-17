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
}: {
  packages: Package[];
  accentColor: string;
  eyebrowNumber: string;
}) {
  if (!packages || packages.length === 0) return null;

  // Highlighting the middle option only makes sense with a clear middle —
  // matches the "Most popular" convention already used on Growth's own
  // /pricing page, not something invented for this component alone.
  const highlightIndex = packages.length === 3 ? 1 : -1;
  const title = sectionTitle(packages);

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
