import Image from "next/image";
import { readableTextOn, shade, ensureContrast } from "@/lib/color";
import { HeroBrandBar } from "./HeroBrandBar";

// "Workroom" archetype (Growth Build Kit, Cottonball): built for a personal
// craft shop or class business run by one person the customer gets to
// know. Deliberately the small, warm opposite of Atelier's heritage-
// manufacturer register: centred rather than asymmetric, and a lighter
// scrim than Atelier's when a photo is present — this stays cosy, not
// dramatic. A member's own photo of their work/space fills the hero behind
// that scrim; no photo falls back to the soft paper tone (Editorial's
// technique) this theme launched with. A dashed rule under the tagline
// echoes the theme's own stitched-edge card seam either way.
export function WorkroomHero({
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
  const paper = shade(secondaryColor, 0.9);
  const scrim = shade(primaryColor, -0.15);
  const textColor = photoUrl ? "#ffffff" : readableTextOn(paper);
  const accent = photoUrl ? ensureContrast(primaryColor, scrim, 3) : ensureContrast(primaryColor, paper);
  const ctaTextColor = readableTextOn(primaryColor);

  return (
    <header id="top" className="relative overflow-hidden" style={{ backgroundColor: photoUrl ? scrim : paper }}>
      {photoUrl && (
        <>
          <Image src={photoUrl} alt={businessName} fill priority sizes="100vw" className="absolute inset-0 object-cover" />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: `linear-gradient(180deg, ${scrim}b3 0%, ${scrim}80 45%, ${scrim}e6 100%)` }}
          />
        </>
      )}

      <div className="relative mx-auto flex max-w-4xl items-center justify-center px-5 py-5 sm:px-8">
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

      <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-5 px-4 pb-24 pt-6 text-center sm:pb-28">
        {tagline && (
          <p
            className="border-t-2 border-dashed pt-3 text-xs font-semibold uppercase tracking-[0.25em]"
            style={{ borderColor: `${accent}80`, color: accent }}
          >
            {tagline}
          </p>
        )}
        <h1 className="max-w-xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl" style={{ color: textColor }}>
          {headline}
        </h1>
        <p className="max-w-lg text-lg opacity-80" style={{ color: textColor }}>
          {subheadline}
        </p>
        <a
          href="#lead-form"
          className="mt-2 rounded-full px-8 py-3.5 text-base font-semibold shadow-lg transition hover:-translate-y-0.5"
          style={{ backgroundColor: primaryColor, color: ctaTextColor }}
        >
          {ctaLabel}
        </a>
      </div>
    </header>
  );
}
