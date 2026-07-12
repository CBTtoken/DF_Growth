import { readableTextOn } from "@/lib/color";
import { HeroBrandBar } from "./HeroBrandBar";

// "Social Proof & Trust First" archetype: a short, compact hero so the
// TrustBadges section (real testimonials) lands almost immediately below
// it — see templateConfig.ts, which moves "trust" to the front of the
// section order for this template only. No fabricated review counts or
// star ratings here (the Bolt source demo hardcoded "4.9 · 1,200+
// reviews"); testimonials.length is the only number this hero is allowed
// to reference, and only when there actually are some.
export function CompactHero({
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
  testimonialCount,
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
  testimonialCount: number;
}) {
  const textColor = readableTextOn(secondaryColor);
  const ctaTextColor = readableTextOn(primaryColor);

  return (
    <header id="top" className="border-b" style={{ backgroundColor: secondaryColor, borderColor: `${textColor}1a` }}>
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5 sm:px-8">
        <HeroBrandBar
          businessName={businessName}
          logoUrl={logoUrl}
          facebookUrl={facebookUrl}
          instagramUrl={instagramUrl}
          websiteUrl={websiteUrl}
          textColor={textColor}
        />
        <a
          href="#lead-form"
          className="rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5"
          style={{ backgroundColor: primaryColor, color: ctaTextColor }}
        >
          {ctaLabel}
        </a>
      </div>

      <div className="mx-auto max-w-3xl px-6 pb-14 pt-6 text-center sm:pb-20">
        {testimonialCount > 0 && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold"
            style={{ backgroundColor: `${primaryColor}1a`, color: primaryColor }}
          >
            ★ Trusted by {testimonialCount} {testimonialCount === 1 ? "customer" : "customers"} and counting
          </span>
        )}
        <h1
          className="mt-5 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl"
          style={{ color: textColor }}
        >
          {headline}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg opacity-70" style={{ color: textColor }}>
          {subheadline}
        </p>
      </div>
    </header>
  );
}
