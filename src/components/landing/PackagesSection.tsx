// Server component. A client's own service packages / pricing tiers —
// entirely optional, distinct from ServicesList (a flat list of what they
// do) since packages carry a price and a name a visitor can pick between.
// Renders nothing if the client never filled this in.
type Package = { name: string; price: string; description: string };

export function PackagesSection({
  packages,
  ctaLabel,
  accentColor,
  eyebrowNumber,
}: {
  packages: Package[];
  ctaLabel: string;
  accentColor: string;
  eyebrowNumber: string;
}) {
  if (!packages || packages.length === 0) return null;

  // Highlighting the middle option only makes sense with a clear middle —
  // matches the "Most popular" convention already used on Growth's own
  // /pricing page, not something invented for this component alone.
  const highlightIndex = packages.length === 3 ? 1 : -1;

  return (
    <section id="packages" className="border-b border-gray-100 bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8 sm:py-24">
        <p className="font-mono text-xs uppercase tracking-[0.2em]" style={{ color: accentColor }}>
          {eyebrowNumber} — Packages
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
                {pkg.price && <p className="text-xl font-bold" style={{ color: accentColor }}>{pkg.price}</p>}
                {pkg.description && <p className="text-sm text-gray-600">{pkg.description}</p>}
                <a
                  href="#lead-form"
                  className="mt-auto rounded-full px-5 py-2.5 text-center text-sm font-semibold shadow-sm transition hover:-translate-y-0.5"
                  style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}
                >
                  {ctaLabel}
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
