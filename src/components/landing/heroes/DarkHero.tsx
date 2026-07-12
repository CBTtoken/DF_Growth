import { ensureContrast, readableTextOn, shade } from "@/lib/color";
import { HeroBrandBar } from "./HeroBrandBar";

// "High-Impact Dark Mode" archetype: sleek near-black hero with a
// high-contrast gradient glow in the client's own brand color. Only the
// hero goes dark — every section below it stays the standard light,
// contrast-tested card layout (see templateConfig.ts), a common and
// perfectly legitimate pattern (dark hero, light content) rather than
// reskinning six shared components for a single template.
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
}) {
  const bg = "#0a0a0f";
  const textColor = "#f5f5f7";
  const glow = ensureContrast(primaryColor, bg, 3);
  const ctaTextColor = readableTextOn(glow);

  return (
    <header id="top" className="relative overflow-hidden text-center" style={{ backgroundColor: bg }}>
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[48rem] -translate-x-1/2 opacity-40 blur-3xl"
        style={{ background: `radial-gradient(circle at center, ${shade(glow, 0.1)}, transparent 65%)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(${textColor} 1px, transparent 1px), linear-gradient(90deg, ${textColor} 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
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

      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 pb-28 pt-10 sm:pb-40">
        <span
          className="rounded-full border px-4 py-1.5 font-mono text-xs uppercase tracking-[0.2em]"
          style={{ borderColor: `${glow}66`, color: glow }}
        >
          {businessName}
        </span>
        <h1 className="max-w-2xl text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl" style={{ color: textColor }}>
          {headline}
        </h1>
        <p className="max-w-xl text-lg opacity-70" style={{ color: textColor }}>
          {subheadline}
        </p>
        <a
          href="#lead-form"
          className="mt-2 rounded-full px-9 py-4 text-base font-semibold shadow-[0_0_40px_-10px] transition hover:-translate-y-0.5"
          style={{ backgroundColor: glow, color: ctaTextColor, boxShadow: `0 0 40px -10px ${glow}` }}
        >
          {ctaLabel}
        </a>
      </div>
    </header>
  );
}
