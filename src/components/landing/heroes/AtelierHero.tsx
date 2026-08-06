import Image from "next/image";
import { readableTextOn, shade, ensureContrast } from "@/lib/color";
import { HeroBrandBar } from "./HeroBrandBar";

// "Atelier" archetype (Growth Build Kit, Greeff Kitchens): built for a
// bespoke workshop or manufacturer trading on real years and a body of
// finished work. Serif type for the heritage feel. When the member has a
// photo of their own work, it fills the hero behind a warm scrim derived
// from their own colour — a workshop selling a considered purchase should
// lead with the work itself, the same reasoning Retreat uses for a
// property. No photo falls back to the solid warm panel this theme
// launched with, still a deliberate choice (a workshop's brand colour is
// usually already warm — wood, brass, walnut) rather than a blank space.
// The tagline sits as a small plaque-style tag above the headline, the
// same reusable "credential line" mechanism every Build Kit hero in this
// batch uses, here reading as the workshop's own founding line rather than
// being invented by the template.
export function AtelierHero({
  businessName,
  logoUrl,
  tagline,
  headline,
  subheadline,
  ctaLabel,
  primaryColor,
  secondaryColor,
  facebookUrl,
  instagramUrl,
  websiteUrl,
  shopHref,
  photoUrl,
}: {
  businessName: string;
  logoUrl: string | null;
  tagline: string | null;
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
  photoUrl: string | null;
}) {
  const scrim = shade(primaryColor, -0.3);
  const textColor = photoUrl ? "#ffffff" : readableTextOn(primaryColor);
  const accent = photoUrl ? ensureContrast(secondaryColor, scrim, 3) : ensureContrast(secondaryColor, primaryColor, 3);
  const ctaTextColor = readableTextOn(secondaryColor);

  return (
    <header id="top" className="relative overflow-hidden" style={{ backgroundColor: photoUrl ? scrim : primaryColor }}>
      {photoUrl ? (
        <>
          <Image src={photoUrl} alt={businessName} fill priority sizes="100vw" className="absolute inset-0 object-cover" />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: `linear-gradient(100deg, ${scrim}f2 0%, ${scrim}cc 40%, ${scrim}66 75%, ${scrim}33 100%)` }}
          />
        </>
      ) : (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{ background: `radial-gradient(circle at 15% 100%, ${shade(primaryColor, 0.15)}, transparent 55%)` }}
        />
      )}

      <div className="relative mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
        <HeroBrandBar
          businessName={businessName}
          logoUrl={logoUrl}
          facebookUrl={facebookUrl}
          instagramUrl={instagramUrl}
          websiteUrl={websiteUrl}
          shopHref={shopHref}
          textColor={textColor}
        />
      </div>

      <div className="relative mx-auto flex max-w-3xl flex-col items-start gap-6 px-5 pb-24 pt-8 sm:px-8 sm:pb-36">
        {tagline && (
          <span
            className="inline-flex items-center gap-2 border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em]"
            style={{ borderColor: `${accent}66`, color: accent }}
          >
            {tagline}
          </span>
        )}
        <h1 className="max-w-2xl font-serif text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl" style={{ color: textColor }}>
          {headline}
        </h1>
        <p className="max-w-xl text-lg opacity-85" style={{ color: textColor }}>
          {subheadline}
        </p>
        <a
          href="#lead-form"
          className="mt-2 rounded-sm px-8 py-3.5 text-base font-semibold shadow-lg transition hover:-translate-y-0.5"
          style={{ backgroundColor: secondaryColor, color: ctaTextColor }}
        >
          {ctaLabel}
        </a>
      </div>
    </header>
  );
}
