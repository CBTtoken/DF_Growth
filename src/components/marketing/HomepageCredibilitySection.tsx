type FeaturedTestimonial = {
  id: string;
  author_name: string;
  quote: string;
  rating: number | null;
};

// Sprint 1, Build Item 3. Founder story copy hasn't been supplied yet
// (FOUNDER_STORY env var, intentionally following the same drop-in-later
// pattern as WELCOME_ASSET_URL — omitted entirely while unset rather than
// shipping placeholder text on a live public page) — ships now regardless,
// since the testimonials grid populates progressively as Dewald flags real
// client testimonials as featured, with zero code changes needed per
// testimonial. Renders nothing at all if there's neither a founder story
// nor any featured testimonials yet, rather than an empty-feeling section.
export function HomepageCredibilitySection({ testimonials }: { testimonials: FeaturedTestimonial[] }) {
  const founderStory = process.env.FOUNDER_STORY;

  if (!founderStory && testimonials.length === 0) return null;

  return (
    <section className="bg-white px-6 py-16">
      <div className="mx-auto max-w-5xl">
        {founderStory && (
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl uppercase tracking-wide text-ink">Why We Built This</h2>
            <p className="mt-4 text-lg leading-relaxed text-gray-600">{founderStory}</p>
          </div>
        )}

        {testimonials.length > 0 && (
          <div className={founderStory ? "mt-12" : ""}>
            <h3 className="text-center font-display text-2xl uppercase tracking-wide text-ink">
              Real Businesses, Real Results
            </h3>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t) => (
                <blockquote key={t.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-sm shadow-sm">
                  <p className="text-gray-700">&ldquo;{t.quote}&rdquo;</p>
                  <footer className="mt-3 flex items-center justify-between text-gray-500">
                    <span>— {t.author_name}</span>
                    {t.rating && <span className="text-brand">{"★".repeat(t.rating)}</span>}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
