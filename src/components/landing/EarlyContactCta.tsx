// Combined spec Sec 19: for a client with no packages configured, the
// contact form (the actual point of the page, since call/WhatsApp details
// stay hidden until someone submits it per Sec 20) otherwise sits last,
// section 07 of 7, after Story, About, What We Offer, Testimonials, and
// Gallery. Rather than reordering sections (which would also reshuffle the
// eyebrow numbering across every template), this adds a second, earlier
// entry point that just scrolls down to the same #lead-form — the
// lower-risk of the two options the spec allows for. Only rendered by the
// caller when packages.length === 0.
export function EarlyContactCta({ accentColor }: { accentColor: string }) {
  return (
    <div className="border-b border-gray-100 bg-white px-4 py-10 text-center sm:px-8">
      <a
        href="#lead-form"
        className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5"
        style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}
      >
        Get in touch ↓
      </a>
    </div>
  );
}
