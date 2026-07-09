import { shade, readableTextOn } from "@/lib/color";

// CLAUDE.md Section 7 rule 1 (five-second rule): logo, one-line value prop,
// one-line "why it matters", one high-contrast CTA — nothing else. Server
// component on purpose, no client-side JS required to render or navigate
// the CTA (a plain anchor to #lead-form), so nothing blocks the hero paint —
// including the background: it's a pure-CSS radial gradient derived from
// the client's own color, not a JS-animated effect that could gate paint.
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
  const textColor = readableTextOn(primaryColor);
  const glow = shade(primaryColor, 0.25);

  return (
    <header
      className="relative flex flex-col items-center gap-6 overflow-hidden px-4 py-24 text-center sm:py-32"
      style={{
        backgroundColor: primaryColor,
        backgroundImage: `radial-gradient(circle at 15% 15%, ${glow} 0%, transparent 45%), radial-gradient(circle at 85% 85%, ${glow} 0%, transparent 45%)`,
      }}
    >
      <span
        className="rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
        style={{ backgroundColor: secondaryColor, color: primaryColor }}
      >
        {businessName}
      </span>
      <h1
        className="max-w-3xl text-4xl font-bold leading-[1.1] sm:text-6xl"
        style={{ color: textColor }}
      >
        {headline}
      </h1>
      <p className="max-w-xl text-lg opacity-90" style={{ color: textColor }}>
        {subheadline}
      </p>
      <a
        href="#lead-form"
        className="mt-2 rounded-full px-8 py-3.5 text-base font-semibold shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
        style={{ backgroundColor: secondaryColor, color: primaryColor }}
      >
        {ctaLabel}
      </a>
    </header>
  );
}
