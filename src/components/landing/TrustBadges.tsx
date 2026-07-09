type Testimonial = {
  id: string;
  author_name: string;
  quote: string;
  rating: number | null;
};

// CLAUDE.md Section 7 rule 2: trust elements live next to the CTA, not
// buried in a footer. Server component — a horizontally-scrollable strip
// needs no JS to be a "slider", keeping the hero/trust section non-blocking.
export function TrustBadges({
  testimonials,
  accentColor,
  eyebrowNumber,
}: {
  testimonials: Testimonial[];
  accentColor: string;
  eyebrowNumber: string;
}) {
  return (
    <section className="border-b border-gray-100 bg-white">
      <div className="border-b border-gray-100" style={{ backgroundColor: `${accentColor}0d` }}>
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-2.5 px-4 py-4 sm:px-8">
          <span aria-hidden style={{ color: accentColor }}>🔒</span>
          <p className="text-sm font-medium text-gray-700">Secure payment via Paystack</p>
        </div>
      </div>

      {testimonials.length > 0 && (
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8 sm:py-24">
          <p className="font-mono text-xs uppercase tracking-[0.2em]" style={{ color: accentColor }}>
            {eyebrowNumber} — What people say
          </p>
          <div className="mt-10 flex w-full gap-4 overflow-x-auto pb-2">
            {testimonials.map((t) => (
              <blockquote
                key={t.id}
                className="min-w-[280px] flex-shrink-0 rounded-2xl border border-gray-100 bg-gray-50 p-6 text-sm shadow-sm"
              >
                <p className="text-gray-700">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-3 flex items-center justify-between text-gray-500">
                  <span>— {t.author_name}</span>
                  {t.rating && (
                    <span style={{ color: accentColor }}>{"★".repeat(t.rating)}</span>
                  )}
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
