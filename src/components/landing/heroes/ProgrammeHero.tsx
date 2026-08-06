import Image from "next/image";
import { readableTextOn, shade } from "@/lib/color";
import { HeroBrandBar } from "./HeroBrandBar";

// "Programme" archetype (Growth Build Kit, Cape Town Butler): built for
// credentialed training and coaching. No testimonial, review or rating can
// ever appear anywhere on Growth (house rule, absolute), so a page like
// this has to earn trust a different way — the tagline reads as a real,
// stated credential line rather than being buried in a paragraph, and the
// courses themselves (Packages, priced and named) do the rest of the
// convincing. A clean two-column frame, professional rather than warm:
// text and credential line left, a photo of the work right when one
// exists, a plain tinted panel when it doesn't.
export function ProgrammeHero({
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
  const ctaTextColor = readableTextOn(primaryColor);

  return (
    <header id="top" className="bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <HeroBrandBar
          businessName={businessName}
          logoUrl={logoUrl}
          facebookUrl={facebookUrl}
          instagramUrl={instagramUrl}
          websiteUrl={websiteUrl}
          shopHref={shopHref}
          textColor="#111827"
        />
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-5 pb-14 pt-4 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-20">
        <div className="flex flex-col items-start gap-5 text-left">
          {tagline && (
            <span
              className="inline-flex rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
              style={{ backgroundColor: `${primaryColor}14`, color: primaryColor }}
            >
              {tagline}
            </span>
          )}
          <h1 className="max-w-xl text-4xl font-bold leading-[1.1] tracking-tight text-gray-900 sm:text-5xl">
            {headline}
          </h1>
          <p className="max-w-lg text-lg text-gray-600">{subheadline}</p>
          <a
            href="#lead-form"
            className="rounded-full px-8 py-3.5 text-base font-semibold shadow-lg transition hover:-translate-y-0.5"
            style={{ backgroundColor: primaryColor, color: ctaTextColor }}
          >
            {ctaLabel}
          </a>
        </div>

        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-gray-200">
          {photoUrl ? (
            <Image src={photoUrl} alt={businessName} fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${shade(primaryColor, -0.25)})` }}
            />
          )}
        </div>
      </div>
    </header>
  );
}
