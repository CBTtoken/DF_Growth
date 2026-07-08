type Testimonial = {
  id: string;
  author_name: string;
  quote: string;
  rating: number | null;
};

// CLAUDE.md Section 7 rule 2: trust elements live next to the CTA, not
// buried in a footer. Server component — a horizontally-scrollable strip
// needs no JS to be a "slider", keeping the hero/trust section non-blocking.
export function TrustBadges({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <section className="flex flex-col items-center gap-6 px-4 py-10">
      <div className="flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-600">
        <span aria-hidden>🔒</span>
        Secure payment via Paystack
      </div>

      {testimonials.length > 0 && (
        <div className="flex w-full max-w-4xl gap-4 overflow-x-auto pb-2">
          {testimonials.map((t) => (
            <blockquote
              key={t.id}
              className="min-w-[260px] flex-shrink-0 rounded-lg border border-gray-200 p-4 text-sm"
            >
              <p className="text-gray-700">&ldquo;{t.quote}&rdquo;</p>
              <footer className="mt-2 text-gray-500">
                — {t.author_name}
                {t.rating ? ` · ${"★".repeat(t.rating)}` : ""}
              </footer>
            </blockquote>
          ))}
        </div>
      )}
    </section>
  );
}
