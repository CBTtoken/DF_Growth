import Image from "next/image";
import { ensureContrast, readableTextOn, shade } from "@/lib/color";
import { HeroBrandBar } from "./HeroBrandBar";

// "High-Impact Dark Mode" archetype, pilot-rebuilt: asymmetric two-column
// hero (headline/CTAs left, a large "signature panel" right) instead of a
// single centered column — the previous version was the exact same
// centered skeleton as MinimalHero/ConversionHero, just recolored, which
// was the actual root of the "looks the same as everything else" feedback.
// The signature panel shows the client's own photo (if they have one) with
// a dark scrim, or a decorative glow/mesh panel when they don't — most
// businesses have 0-1 photos, so the no-photo state has to look equally
// intentional, not like a missing image.
export function DarkHero({
  businessName,
  logoUrl,
  headline,
  subheadline,
  ctaLabel,
  primaryColor,
  facebookUrl,
  instagramUrl,
  websiteUrl,
  photoUrl,
}: {
  businessName: string;
  logoUrl: string | null;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  primaryColor: string;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  websiteUrl?: string | null;
  photoUrl: string | null;
}) {
  const bg = "#0a0a0f";
  const textColor = "#f5f5f7";
  const glow = ensureContrast(primaryColor, bg, 3);
  const ctaTextColor = readableTextOn(glow);

  return (
    <header id="top" className="relative overflow-hidden" style={{ backgroundColor: bg }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(${textColor} 1px, transparent 1px), linear-gradient(90deg, ${textColor} 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
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
          className="rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5"
          style={{ backgroundColor: glow, color: ctaTextColor }}
        >
          {ctaLabel}
        </a>
      </div>

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-24 lg:pt-10">
        <div className="flex flex-col items-start gap-6 text-left">
          <span
            className="rounded-full border px-4 py-1.5 font-mono text-xs uppercase tracking-[0.2em]"
            style={{ borderColor: `${glow}66`, color: glow }}
          >
            {businessName}
          </span>
          <h1
            className="max-w-xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl"
            style={{ color: textColor }}
          >
            {headline}
          </h1>
          <p className="max-w-lg text-lg opacity-70" style={{ color: textColor }}>
            {subheadline}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="#lead-form"
              className="rounded-full px-8 py-4 text-base font-semibold transition hover:-translate-y-0.5"
              style={{ backgroundColor: glow, color: ctaTextColor, boxShadow: `0 0 40px -10px ${glow}` }}
            >
              {ctaLabel}
            </a>
            <a
              href="#trust"
              className="rounded-full border px-8 py-4 text-base font-semibold transition hover:-translate-y-0.5"
              style={{ borderColor: `${textColor}33`, color: textColor }}
            >
              See what people say
            </a>
          </div>
        </div>

        <div
          className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl border"
          style={{ borderColor: `${glow}40` }}
        >
          {photoUrl ? (
            <>
              <Image
                src={photoUrl}
                alt={businessName}
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
              <div
                aria-hidden
                className="absolute inset-0"
                style={{ background: `linear-gradient(180deg, transparent 45%, ${bg} 100%)` }}
              />
            </>
          ) : (
            <>
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(circle at 30% 20%, ${shade(glow, 0.15)}, transparent 60%), radial-gradient(circle at 80% 85%, ${shade(glow, -0.2)}33, transparent 55%)`,
                }}
              />
              <div
                aria-hidden
                className="absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage: `linear-gradient(${textColor} 1px, transparent 1px), linear-gradient(90deg, ${textColor} 1px, transparent 1px)`,
                  backgroundSize: "32px 32px",
                }}
              />
            </>
          )}
          <div className="absolute inset-x-0 bottom-0 p-6">
            <div
              className="w-fit rounded-2xl border px-4 py-3 backdrop-blur-sm"
              style={{ borderColor: `${textColor}1a`, backgroundColor: `${bg}b3` }}
            >
              <p className="font-mono text-xs uppercase tracking-widest" style={{ color: glow }}>
                Premium · {businessName}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
