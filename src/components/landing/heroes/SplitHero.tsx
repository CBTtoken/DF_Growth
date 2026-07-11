import Image from "next/image";
import { readableTextOn, shade } from "@/lib/color";
import { HeroBrandBar } from "./HeroBrandBar";

// "Left-Heavy Split" archetype: strict 50/50, text+CTA locked left, a large
// media showcase right. The only new template that needs a real photo
// (src/lib/images/pexels.ts, searched by the client's own industry) — every
// other variant is built from brand color alone. photoUrl is nullable
// because that search is best-effort; the right panel falls back to a
// tinted color block instead of leaving a broken image.
export function SplitHero({
  businessName,
  logoUrl,
  headline,
  subheadline,
  ctaLabel,
  primaryColor,
  secondaryColor,
  facebookUrl,
  instagramUrl,
  photoUrl,
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
  photoUrl: string | null;
}) {
  const textColor = readableTextOn(secondaryColor);
  const ctaTextColor = readableTextOn(primaryColor);

  return (
    <header id="top" className="flex flex-col lg:flex-row" style={{ backgroundColor: secondaryColor }}>
      <div className="flex flex-1 flex-col justify-center gap-8 px-6 py-10 sm:px-10 lg:py-16">
        <HeroBrandBar
          businessName={businessName}
          logoUrl={logoUrl}
          facebookUrl={facebookUrl}
          instagramUrl={instagramUrl}
          textColor={textColor}
        />
        <div className="flex flex-col gap-5">
          <h1
            className="max-w-lg text-4xl font-black leading-[1.1] tracking-tight sm:text-5xl"
            style={{ color: textColor }}
          >
            {headline}
          </h1>
          <p className="max-w-md text-lg opacity-80" style={{ color: textColor }}>
            {subheadline}
          </p>
        </div>
        <a
          href="#lead-form"
          className="w-fit rounded-xl px-7 py-4 text-base font-semibold shadow-lg transition hover:-translate-y-0.5"
          style={{ backgroundColor: primaryColor, color: ctaTextColor }}
        >
          {ctaLabel}
        </a>
      </div>

      <div className="relative min-h-[320px] flex-1 lg:min-h-[640px]">
        {photoUrl ? (
          <Image src={photoUrl} alt={businessName} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${shade(primaryColor, -0.3)})` }}
          />
        )}
      </div>
    </header>
  );
}
