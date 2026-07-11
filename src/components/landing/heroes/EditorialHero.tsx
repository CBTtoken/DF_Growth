import { readableTextOn, shade, ensureContrast } from "@/lib/color";
import { HeroBrandBar } from "./HeroBrandBar";

// "Storyteller Vertical" archetype: long-scroll editorial feel. Pairs with
// a page.tsx section order that puts StorySection right after this hero —
// StorySection already renders the client's own additional_notes verbatim,
// which is exactly the founder-story narrative this archetype is built
// around, so no new story-content component was needed for it.
export function EditorialHero({
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
  // A warm off-white paper tone derived from the client's own color rather
  // than a fixed stone/cream palette, so the editorial feel still looks
  // considered whatever brand color a client actually picks.
  const paper = shade(secondaryColor, 0.92);
  const textColor = readableTextOn(paper);
  const accent = ensureContrast(primaryColor, paper);

  return (
    <header id="top" style={{ backgroundColor: paper }}>
      <div className="mx-auto flex max-w-5xl items-center justify-between border-b px-6 py-5 sm:px-8" style={{ borderColor: `${textColor}1a` }}>
        <HeroBrandBar
          businessName={businessName}
          logoUrl={logoUrl}
          facebookUrl={facebookUrl}
          instagramUrl={instagramUrl}
          textColor={textColor}
        />
        <a
          href="#lead-form"
          className="text-sm font-semibold underline-offset-4 hover:underline"
          style={{ color: accent }}
        >
          {ctaLabel}
        </a>
      </div>

      <div className="mx-auto max-w-4xl px-6 pb-20 pt-16 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.3em] opacity-50" style={{ color: textColor }}>
          A founder&apos;s story
        </p>
        <h1
          className="mt-5 font-serif text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl md:text-7xl"
          style={{ color: textColor }}
        >
          {headline}
        </h1>
        <p className="mt-8 max-w-2xl text-xl leading-relaxed opacity-80" style={{ color: textColor }}>
          {subheadline}
        </p>
      </div>
    </header>
  );
}
