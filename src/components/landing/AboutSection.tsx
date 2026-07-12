// Server component, no client JS — same reasoning as TrustBadges. Renders
// nothing if there's no about copy yet (a client who hasn't been through the
// AI-assisted Landing Copy step, or skipped it, shouldn't get a blank box).
export function AboutSection({
  businessName,
  tagline,
  aboutText,
  accentColor,
  eyebrowNumber,
}: {
  businessName: string;
  tagline: string | null;
  aboutText: string | null;
  accentColor: string;
  eyebrowNumber: string;
}) {
  if (!aboutText) return null;

  return (
    <section id="about" className="border-b border-gray-100 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8 sm:py-24">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_1.4fr] md:gap-14">
          <div>
            <p className="font-mono text-sm font-semibold uppercase tracking-[0.2em] sm:text-base" style={{ color: accentColor }}>
              {eyebrowNumber} — About
            </p>
            <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl">
              About {businessName}
            </h2>
          </div>
          <div>
            {tagline && <p className="mb-3 text-base font-medium text-gray-500">{tagline}</p>}
            <p className="text-lg leading-relaxed text-gray-600">{aboutText}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
