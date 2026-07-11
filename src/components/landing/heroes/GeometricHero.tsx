import { readableTextOn, shade } from "@/lib/color";
import { HeroBrandBar } from "./HeroBrandBar";

// "Bold & Vibrant Geometric" archetype: asymmetrical overlapping color
// blocks instead of stock photography — every shape is a tint/shade of the
// client's own two brand colors (src/lib/color.ts), so it stays "playful"
// for any color pair rather than only working with the specific palette a
// designer had in mind.
export function GeometricHero({
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
  const bg = shade(secondaryColor, 0.85);
  const textColor = readableTextOn(bg);
  const ctaTextColor = readableTextOn(primaryColor);
  const blockA = shade(primaryColor, 0.15);
  const blockB = shade(primaryColor, -0.15);

  return (
    <header id="top" className="relative overflow-hidden" style={{ backgroundColor: bg }}>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-10 h-64 w-64 rotate-12 rounded-[3rem] opacity-80 sm:h-80 sm:w-80"
        style={{ backgroundColor: blockA }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 -rotate-6 rounded-full opacity-70 sm:h-72 sm:w-72"
        style={{ backgroundColor: blockB }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-1/4 top-1/2 h-24 w-24 rotate-45 opacity-60"
        style={{ backgroundColor: secondaryColor, borderRadius: "1.5rem" }}
      />

      <div className="relative mx-auto flex max-w-5xl items-center justify-between px-6 py-5 sm:px-8">
        <HeroBrandBar
          businessName={businessName}
          logoUrl={logoUrl}
          facebookUrl={facebookUrl}
          instagramUrl={instagramUrl}
          textColor={textColor}
        />
      </div>

      <div className="relative mx-auto flex max-w-2xl flex-col gap-6 px-6 pb-28 pt-8 sm:pb-40">
        <h1
          className="text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl"
          style={{ color: textColor }}
        >
          {headline}
        </h1>
        <p className="max-w-md text-lg opacity-80" style={{ color: textColor }}>
          {subheadline}
        </p>
        <a
          href="#lead-form"
          className="w-fit rounded-2xl px-8 py-4 text-base font-bold shadow-lg transition hover:-translate-y-0.5 hover:rotate-1"
          style={{ backgroundColor: primaryColor, color: ctaTextColor }}
        >
          {ctaLabel}
        </a>
      </div>
    </header>
  );
}
