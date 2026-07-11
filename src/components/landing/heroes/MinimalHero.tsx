import { readableTextOn } from "@/lib/color";
import { HeroBrandBar } from "./HeroBrandBar";

// "Single-Action Minimalist" archetype: massive centered headline, zero
// distractions, one CTA. Deliberately has no secondary "About us ↓" link
// and pairs with a page.tsx section order of just Hero + LeadForm — the
// archetype's whole point is not giving a visitor anywhere else to look.
export function MinimalHero({
  businessName,
  logoUrl,
  headline,
  subheadline,
  ctaLabel,
  primaryColor,
  secondaryColor,
  facebookUrl,
  instagramUrl,
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
}) {
  const textColor = readableTextOn(secondaryColor);

  return (
    <header id="top" className="relative" style={{ backgroundColor: secondaryColor }}>
      <div className="mx-auto flex max-w-5xl items-center justify-center px-5 py-8 sm:px-8">
        <HeroBrandBar
          businessName={businessName}
          logoUrl={logoUrl}
          facebookUrl={facebookUrl}
          instagramUrl={instagramUrl}
          textColor={textColor}
        />
      </div>

      <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 px-4 pb-28 pt-8 text-center sm:pb-40">
        <h1
          className="text-5xl font-black leading-[1.05] tracking-tight sm:text-7xl"
          style={{ color: textColor }}
        >
          {headline}
        </h1>
        <p className="max-w-md text-xl opacity-70" style={{ color: textColor }}>
          {subheadline}
        </p>
        <a
          href="#lead-form"
          className="rounded-full px-10 py-4 text-lg font-semibold shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          style={{ backgroundColor: primaryColor, color: readableTextOn(primaryColor) }}
        >
          {ctaLabel}
        </a>
      </div>
    </header>
  );
}
