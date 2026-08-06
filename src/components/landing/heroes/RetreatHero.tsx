import Image from "next/image";
import { readableTextOn, shade } from "@/lib/color";
import { HeroBrandBar } from "./HeroBrandBar";

// "Retreat" archetype (Growth Build Kit, The Falling Feather Inn): a
// stay-and-relax business isn't fixing an urgent problem or comparing
// considered-purchase options, they're deciding whether this looks like a
// nice place to be. So the property itself fills the hero — a real photo
// with a warm scrim derived from the client's own colour, never a fixed
// filter — and the tagline sits as a quiet line above the headline rather
// than being folded into it. No photo simply means the scrim's own colour
// carries the hero, the same graceful fallback every photo-backed hero here
// uses.
export function RetreatHero({
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
  const scrim = shade(primaryColor, -0.35);
  const textColor = "#ffffff";
  const ctaTextColor = readableTextOn(secondaryColor);

  return (
    <header id="top" className="relative overflow-hidden" style={{ backgroundColor: scrim }}>
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={businessName}
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: `radial-gradient(circle at 30% 20%, ${shade(primaryColor, 0.1)}, ${scrim} 70%)` }}
        />
      )}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: `linear-gradient(180deg, ${scrim}cc 0%, ${scrim}66 35%, ${scrim}e6 100%)` }}
      />

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

      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 pb-24 pt-10 text-center sm:pb-32">
        {tagline && (
          <p className="text-xs font-semibold uppercase tracking-[0.3em] opacity-80" style={{ color: textColor }}>
            {tagline}
          </p>
        )}
        <h1 className="max-w-2xl text-4xl font-bold leading-[1.1] sm:text-6xl" style={{ color: textColor }}>
          {headline}
        </h1>
        <p className="max-w-xl text-lg opacity-90" style={{ color: textColor }}>
          {subheadline}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#lead-form"
            className="rounded-full px-8 py-3.5 text-base font-semibold shadow-lg transition hover:-translate-y-0.5"
            style={{ backgroundColor: secondaryColor, color: ctaTextColor }}
          >
            {ctaLabel}
          </a>
          <a
            href="#services"
            className="text-sm font-medium underline-offset-4 opacity-85 hover:underline"
            style={{ color: textColor }}
          >
            See what's on site ↓
          </a>
        </div>
      </div>
    </header>
  );
}
