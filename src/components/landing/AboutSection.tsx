// Server component, no client JS — same reasoning as TrustBadges. Renders
// nothing if there's no about copy yet (a client who hasn't been through the
// AI-assisted Landing Copy step, or skipped it, shouldn't get a blank box).
export function AboutSection({
  businessName,
  tagline,
  aboutText,
  accentColor,
}: {
  businessName: string;
  tagline: string | null;
  aboutText: string | null;
  accentColor: string;
}) {
  if (!aboutText) return null;

  return (
    <section className="flex flex-col items-center gap-3 px-4 py-16 text-center">
      {tagline && (
        <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: accentColor }}>
          {tagline}
        </span>
      )}
      <h2 className="text-2xl font-bold text-gray-900">About {businessName}</h2>
      <p className="max-w-2xl text-gray-600">{aboutText}</p>
    </section>
  );
}
