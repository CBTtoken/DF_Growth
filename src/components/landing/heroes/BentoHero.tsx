import { shade, readableTextOn, ensureContrast } from "@/lib/color";
import { HeroBrandBar } from "./HeroBrandBar";

// "Content-Dense Feature Grid" archetype hero. Was sharing ConversionHero
// (the plain centered default) with two other templates, which was the root
// of the "these all look the same" problem. This gives it its own identity:
// an asymmetric bento, a big headline cell on the left and a 2x2 grid of the
// client's own service highlights as tiles on the right, so the "lots to
// offer, all at a glance" promise is in the hero itself. Pure brand-color
// theming (no fixed palette), server component, plain-anchor CTA — same
// paint-safe rules as ConversionHero.
export function BentoHero({
  businessName,
  logoUrl,
  headline,
  subheadline,
  ctaLabel,
  primaryColor,
  secondaryColor,
  facebookUrl,
  instagramUrl,
  websiteUrl,
  shopHref,
  highlights,
  ctaHref = "#lead-form",
}: {
  businessName: string;
  logoUrl: string | null;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  primaryColor: string;
  secondaryColor: string;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  websiteUrl?: string | null;
  /** Set only when this business has products on sale. */
  shopHref?: string;
  highlights: string[];
  ctaHref?: string;
}) {
  const textColor = readableTextOn(primaryColor);
  const glow = shade(primaryColor, 0.3);
  const ctaTextColor = ensureContrast(primaryColor, secondaryColor);
  const tiles = highlights.filter(Boolean).slice(0, 4);

  return (
    <header id="top" className="relative overflow-hidden" style={{ backgroundColor: primaryColor }}>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-[34rem] rounded-full opacity-50 blur-3xl"
        style={{ background: `radial-gradient(circle at center, ${glow}, transparent 70%)` }}
      />

      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <HeroBrandBar
          businessName={businessName}
          logoUrl={logoUrl}
          facebookUrl={facebookUrl}
          instagramUrl={instagramUrl}
          websiteUrl={websiteUrl}
          shopHref={shopHref}
          textColor={textColor}
        />
        <a
          href={ctaHref}
          className="rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5"
          style={{ backgroundColor: secondaryColor, color: ctaTextColor }}
        >
          {ctaLabel}
        </a>
      </div>

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-6 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[1.25fr_1fr] lg:gap-8 lg:pb-24 lg:pt-10">
        <div className="flex flex-col items-start gap-6">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 font-mono text-xs uppercase tracking-[0.2em]"
            style={{ borderColor: `${textColor}33`, color: textColor }}
          >
            <span className="inline-block size-1.5 rounded-full" style={{ backgroundColor: secondaryColor }} />
            {businessName}
          </span>
          <h1 className="max-w-xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl" style={{ color: textColor }}>
            {headline}
          </h1>
          <p className="max-w-lg text-lg opacity-85" style={{ color: textColor }}>
            {subheadline}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={ctaHref}
              className="rounded-full px-8 py-3.5 text-base font-semibold shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
              style={{ backgroundColor: secondaryColor, color: ctaTextColor }}
            >
              {ctaLabel}
            </a>
            <a
              href="#services"
              className="text-sm font-medium underline-offset-4 opacity-85 hover:underline"
              style={{ color: textColor }}
            >
              See everything we do ↓
            </a>
          </div>
        </div>

        {tiles.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {tiles.map((tile, i) => (
              <div
                key={i}
                className="flex min-h-[7rem] flex-col justify-between rounded-2xl border p-4 backdrop-blur-sm"
                style={{ borderColor: `${textColor}1f`, backgroundColor: `${textColor}14` }}
              >
                <span className="font-mono text-xs opacity-60" style={{ color: textColor }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-base font-semibold leading-snug" style={{ color: textColor }}>
                  {tile}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
