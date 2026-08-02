import { shade, readableTextOn, ensureContrast } from "@/lib/color";
import { HeroBrandBar } from "./HeroBrandBar";

// "Multi-Product Showcase" archetype hero. Previously shared the plain
// centered ConversionHero; now, since this template is packages-first (its
// CTA already points at #packages), the hero previews the client's actual
// packages as a fanned stack of price cards, so the offer is visible up top
// instead of a generic headline. Falls back to a single tasteful card if the
// client hasn't typed packages yet. Brand-color themed, server component.
export function ShowcaseHero({
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
  packages,
  ctaHref = "#packages",
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
  packages: { name: string; price: string | null }[];
  ctaHref?: string;
}) {
  const textColor = readableTextOn(primaryColor);
  const glow = shade(primaryColor, 0.3);
  const ctaTextColor = ensureContrast(primaryColor, secondaryColor);
  const priceTextColor = ensureContrast(primaryColor, "#ffffff");
  const cards = packages.filter((p) => p.name).slice(0, 3);

  return (
    <header id="top" className="relative overflow-hidden" style={{ backgroundColor: primaryColor }}>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-[36rem] rounded-full opacity-50 blur-3xl"
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

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[1fr_1fr] lg:gap-14 lg:pb-24 lg:pt-10">
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
              href="#lead-form"
              className="text-sm font-medium underline-offset-4 opacity-85 hover:underline"
              style={{ color: textColor }}
            >
              Ask us a question ↓
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {(cards.length > 0
            ? cards
            : [{ name: `What ${businessName} offers`, price: null }]
          ).map((card, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-xl ring-1 ring-black/5"
              style={{ marginLeft: `${i * 1.25}rem` }}
            >
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-gray-900">{card.name}</p>
                <p className="text-sm text-gray-500">Tap through to see the details</p>
              </div>
              {card.price && (
                <span
                  className="shrink-0 rounded-full px-3 py-1.5 text-sm font-bold"
                  style={{ backgroundColor: `${priceTextColor}14`, color: priceTextColor }}
                >
                  {card.price}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
