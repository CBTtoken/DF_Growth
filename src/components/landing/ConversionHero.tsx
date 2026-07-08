// CLAUDE.md Section 7 rule 1 (five-second rule): logo, one-line value prop,
// one-line "why it matters", one high-contrast CTA — nothing else. Server
// component on purpose, no client-side JS required to render or navigate
// the CTA (a plain anchor to #lead-form), so nothing blocks the hero paint.
export function ConversionHero({
  businessName,
  headline,
  subheadline,
  ctaLabel,
  primaryColor,
  secondaryColor,
}: {
  businessName: string;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  primaryColor: string;
  secondaryColor: string;
}) {
  return (
    <header
      className="flex flex-col items-center gap-6 px-4 py-20 text-center"
      style={{ backgroundColor: primaryColor }}
    >
      <span className="text-sm font-semibold uppercase tracking-wide" style={{ color: secondaryColor }}>
        {businessName}
      </span>
      <h1 className="max-w-2xl text-3xl font-bold sm:text-4xl" style={{ color: secondaryColor }}>
        {headline}
      </h1>
      <p className="max-w-xl text-lg opacity-90" style={{ color: secondaryColor }}>
        {subheadline}
      </p>
      <a
        href="#lead-form"
        className="rounded-full bg-white px-8 py-3 text-base font-semibold shadow-sm"
        style={{ color: primaryColor }}
      >
        {ctaLabel}
      </a>
    </header>
  );
}
