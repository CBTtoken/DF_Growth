// Server component, no client JS. Distinct from AboutSection on purpose:
// aboutText is AI-drafted from the business's facts and can lightly
// paraphrase them away (a founding year or "family owned" mentioned in the
// client's own notes isn't guaranteed to survive AI summarization). This
// renders additional_notes completely verbatim — nothing the client
// specifically wrote can get lost or reworded here.
export function StorySection({
  storyText,
  accentColor,
  eyebrowNumber,
}: {
  storyText: string | null;
  accentColor: string;
  eyebrowNumber: string;
}) {
  if (!storyText) return null;

  return (
    <section id="story" className="border-b border-gray-100 bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-8 sm:py-24">
        <p className="font-mono text-sm font-semibold uppercase tracking-[0.2em] sm:text-base" style={{ color: accentColor }}>
          {eyebrowNumber} — Our story
        </p>
        <p className="mt-4 whitespace-pre-line text-lg leading-relaxed text-gray-600">{storyText}</p>
      </div>
    </section>
  );
}
