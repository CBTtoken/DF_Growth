import Image from "next/image";
import { shade, readableTextOn, ensureContrast } from "@/lib/color";

// CLAUDE.md Section 7 rule 1 (five-second rule): logo, one-line value prop,
// one-line "why it matters", one high-contrast CTA — nothing else. Server
// component on purpose, no client-side JS required to render or navigate
// the CTA (a plain anchor to #lead-form), so nothing blocks the hero paint —
// including the background: it's a pure-CSS radial gradient derived from
// the client's own color, not a JS-animated effect that could gate paint.
export function ConversionHero({
  businessName,
  tagline,
  logoUrl,
  headline,
  subheadline,
  ctaLabel,
  primaryColor,
  secondaryColor,
}: {
  businessName: string;
  tagline: string | null;
  logoUrl: string | null;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  primaryColor: string;
  secondaryColor: string;
}) {
  const textColor = readableTextOn(primaryColor);
  const glow = shade(primaryColor, 0.3);
  // The CTA pill uses secondaryColor as its background with primaryColor as
  // text — found live during testing that this pair can be just as
  // unreadable as any other raw-color-as-text case if both colors are
  // light (e.g. a light secondary with a light/bright primary).
  const ctaTextColor = ensureContrast(primaryColor, secondaryColor);

  // Every client's headline is arbitrary free text, not a fixed string we
  // can hand-pick a word from — underlining the last word is a rule that
  // generalizes to any headline instead of hardcoding one client's copy.
  const words = headline.trim().split(/\s+/);
  const lastWord = words.pop();
  const leadWords = words.join(" ");

  const initials = businessName
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header id="top" className="relative overflow-hidden text-center" style={{ backgroundColor: primaryColor }}>
      {/* Depth without stock photography: two soft radials in a darker
          shade of the same brand color — fully derived, never a fixed
          palette. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-[36rem] rounded-full opacity-60 blur-3xl"
        style={{ background: `radial-gradient(circle at center, ${glow}, transparent 70%)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-24 size-[32rem] rounded-full opacity-50 blur-3xl"
        style={{ background: `radial-gradient(circle at center, ${glow}, transparent 70%)` }}
      />

      <div className="relative mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
        <span className="flex items-center gap-2 text-sm font-semibold tracking-tight" style={{ color: textColor }}>
          {logoUrl ? (
            <span className="grid size-8 place-items-center overflow-hidden rounded-md bg-white/90 p-1">
              <Image src={logoUrl} alt={businessName} width={28} height={28} className="size-full object-contain" />
            </span>
          ) : (
            <span
              className="grid size-8 place-items-center rounded-md font-mono text-xs font-bold"
              style={{ backgroundColor: `${textColor}26` }}
            >
              {initials}
            </span>
          )}
          {businessName}
        </span>
        <a
          href="#lead-form"
          className="rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5"
          style={{ backgroundColor: secondaryColor, color: ctaTextColor }}
        >
          {ctaLabel}
        </a>
      </div>

      <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 pb-24 pt-8 sm:pb-32">
        <p
          className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] opacity-80"
          style={{ color: textColor }}
        >
          <span className="inline-block h-px w-8" style={{ backgroundColor: `${textColor}80` }} />
          {tagline || businessName}
        </p>

        <h1 className="max-w-3xl text-4xl font-bold leading-[1.05] sm:text-6xl" style={{ color: textColor }}>
          {leadWords}
          {leadWords ? " " : ""}
          <span className="relative whitespace-nowrap">
            <span className="relative z-10">{lastWord}</span>
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-1 z-0 h-3 opacity-25 sm:bottom-2 sm:h-4"
              style={{ backgroundColor: textColor }}
            />
          </span>
        </h1>

        <p className="max-w-xl text-lg opacity-90" style={{ color: textColor }}>
          {subheadline}
        </p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#lead-form"
            className="rounded-full px-8 py-3.5 text-base font-semibold shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
            style={{ backgroundColor: secondaryColor, color: ctaTextColor }}
          >
            {ctaLabel}
          </a>
          <a
            href="#about"
            className="text-sm font-medium underline-offset-4 opacity-85 hover:underline"
            style={{ color: textColor }}
          >
            How it works
          </a>
        </div>
      </div>
    </header>
  );
}
