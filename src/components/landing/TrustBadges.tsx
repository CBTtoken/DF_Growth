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
}: {
  testimonials: Testimonial[];
  accentColor: string;
}) {
  return (
    <section className="flex flex-col items-center gap-8 px-4 py-16">
      <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 shadow-sm">
        <span aria-hidden>🔒</span>
        Secure payment via Paystack
      </div>

      {testimonials.length > 0 && (
        <div className="flex w-full max-w-4xl gap-4 overflow-x-auto pb-2">
          {testimonials.map((t) => (
            <blockquote
              key={t.id}
              className="min-w-[280px] flex-shrink-0 rounded-2xl border border-gray-100 bg-white p-6 text-sm shadow-sm"
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
      )}
    </section>
  );
}
