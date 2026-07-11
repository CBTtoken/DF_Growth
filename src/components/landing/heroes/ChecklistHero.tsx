import { readableTextOn, ensureContrast } from "@/lib/color";
import { HeroBrandBar } from "./HeroBrandBar";

// "App-Style Dashboard Preview" archetype, adapted for a real small
// business rather than software: the Bolt source used a literal app/browser
// mockup with a fake screenshot, which doesn't honestly represent a
// plumber or hair salon. Keeps the "browser chrome" framing device but
// fills it with the client's own real services as a checkmark list
// (servicesText, same field ServicesList renders) instead of a fabricated
// product screenshot — "technical checkmark grid" from the archetype's own
// description, just grounded in real data.
export function ChecklistHero({
  businessName,
  logoUrl,
  headline,
  subheadline,
  ctaLabel,
  primaryColor,
  secondaryColor,
  facebookUrl,
  instagramUrl,
  checklistItems,
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
  checklistItems: string[];
}) {
  const textColor = readableTextOn(primaryColor);
  const ctaTextColor = ensureContrast(primaryColor, secondaryColor);

  return (
    <header id="top" className="text-center" style={{ backgroundColor: primaryColor }}>
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5 sm:px-8">
        <HeroBrandBar
          businessName={businessName}
          logoUrl={logoUrl}
          facebookUrl={facebookUrl}
          instagramUrl={instagramUrl}
          textColor={textColor}
        />
        <a
          href="#lead-form"
          className="rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5"
          style={{ backgroundColor: secondaryColor, color: ctaTextColor }}
        >
          {ctaLabel}
        </a>
      </div>

      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 pt-6" style={{ color: textColor }}>
        <h1 className="text-4xl font-black leading-[1.1] tracking-tight sm:text-5xl">{headline}</h1>
        <p className="max-w-lg text-lg opacity-85">{subheadline}</p>
      </div>

      <div className="mx-auto max-w-2xl px-4 pb-20 pt-10 sm:pb-28">
        <div className="overflow-hidden rounded-2xl bg-white text-left shadow-2xl">
          <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-4 py-3">
            <span className="size-2.5 rounded-full bg-red-400" />
            <span className="size-2.5 rounded-full bg-amber-400" />
            <span className="size-2.5 rounded-full bg-emerald-400" />
            <span className="ml-3 truncate font-mono text-xs text-gray-400">{businessName}</span>
          </div>
          <ul className="flex flex-col gap-3 p-6">
            {checklistItems.length > 0 ? (
              checklistItems.map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-medium text-gray-700">
                  <span
                    className="grid size-6 flex-shrink-0 place-items-center rounded-full text-xs font-bold"
                    style={{ backgroundColor: `${primaryColor}1a`, color: primaryColor }}
                  >
                    ✓
                  </span>
                  {item}
                </li>
              ))
            ) : (
              <li className="text-sm text-gray-400">Your services will show up here.</li>
            )}
          </ul>
        </div>
      </div>
    </header>
  );
}
