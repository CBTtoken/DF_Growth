import type { ReactNode } from "react";
import { shade, readableTextOn, ensureContrast } from "@/lib/color";
import { HeroBrandBar } from "./HeroBrandBar";

// "Interactive Step-by-Step" archetype hero. Previously shared the plain
// centered ConversionHero; now it leads with a visual numbered timeline on
// the right, so the "simple process, start to finish" promise is shown, not
// just stated. Steps are the client's own first three services; if they have
// none yet, a generic three-step process stands in so the hero never looks
// broken. Brand-color themed, server component, plain-anchor CTA.
const FALLBACK_STEPS = ["Get in touch", "We handle everything", "You're sorted"];

export function TimelineHero({
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
  steps,
  ctaHref = "#lead-form",
  contactActions,
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
  steps: string[];
  ctaHref?: string;
  // Handoff 02 A: WhatsApp and Call, rendered inside the hero so they are
  // above the fold. Optional because the preview and sample routes have no
  // real member behind them.
  contactActions?: ReactNode;
}) {
  const textColor = readableTextOn(primaryColor);
  const glow = shade(primaryColor, 0.3);
  const ctaTextColor = ensureContrast(primaryColor, secondaryColor);
  const cleaned = steps.map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const timeline = cleaned.length > 0 ? cleaned : FALLBACK_STEPS;

  return (
    <header id="top" className="relative overflow-hidden" style={{ backgroundColor: primaryColor }}>
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-24 size-[32rem] rounded-full opacity-50 blur-3xl"
        style={{ background: `radial-gradient(circle at center, ${glow}, transparent 70%)` }}
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
          href={ctaHref}
          className="rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5"
          style={{ backgroundColor: secondaryColor, color: ctaTextColor }}
        >
          {ctaLabel}
        </a>
      </div>

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-24 lg:pt-10">
        <div className="flex flex-col items-start gap-6">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 font-mono text-xs uppercase tracking-[0.2em]"
            style={{ borderColor: `${textColor}33`, color: textColor }}
          >
            <span className="inline-block size-1.5 rounded-full" style={{ backgroundColor: secondaryColor }} />
            How it works
          </span>
          <h1 className="max-w-xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl" style={{ color: textColor }}>
            {headline}
          </h1>
          <p className="max-w-lg text-lg opacity-85" style={{ color: textColor }}>
            {subheadline}
          </p>
          {contactActions}
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={ctaHref}
              className="rounded-full px-8 py-3.5 text-base font-semibold shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
              style={{ backgroundColor: secondaryColor, color: ctaTextColor }}
            >
              {ctaLabel}
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium underline-offset-4 opacity-85 hover:underline"
              style={{ color: textColor }}
            >
              See the full process ↓
            </a>
          </div>
        </div>

        <ol className="relative flex flex-col gap-4">
          {timeline.map((step, i) => (
            <li key={i} className="relative flex items-stretch gap-4">
              <div className="flex flex-col items-center">
                <span
                  className="grid size-11 shrink-0 place-items-center rounded-full text-base font-bold shadow-sm"
                  style={{ backgroundColor: secondaryColor, color: ctaTextColor }}
                >
                  {i + 1}
                </span>
                {i < timeline.length - 1 && (
                  <span className="mt-1 w-px flex-1" style={{ backgroundColor: `${textColor}33` }} />
                )}
              </div>
              <div
                className="mb-1 flex flex-1 items-center rounded-2xl border px-5 py-4 backdrop-blur-sm"
                style={{ borderColor: `${textColor}1f`, backgroundColor: `${textColor}14` }}
              >
                <span className="text-base font-semibold leading-snug" style={{ color: textColor }}>
                  {step}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </header>
  );
}
