const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

// Pasted content's own CTA copy is "MESSAGE US ON WHATSAPP TO JOIN" — kept
// verbatim as the button label rather than softened, matching the direct
// tone of the rest of the source material.
export function Hero() {
  const whatsappHref = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
        "Hi, I'd like to hear more about RE:Biz Nomads."
      )}`
    : null;

  return (
    // Real feedback: the first version of this page was plain white
    // top-to-bottom, no color or feeling anywhere. A full-bleed brand-blue
    // hero band (matching the color already used for CTAs elsewhere on
    // Growth, not an invented new palette) is the single highest-impact fix
    // — everything below still alternates white/tinted, but the opening
    // moment now actually reads as designed rather than a bare document.
    <section className="relative overflow-hidden bg-brand-dark px-6 pb-24 pt-32 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand/40 via-transparent to-transparent"
      />
      <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6">
        <span className="rounded-full border border-white/25 px-4 py-1.5 font-badge text-xs uppercase tracking-[0.25em] text-white/80">
          Powered by DigitalFlyer SA — We Use What We Sell
        </span>
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
          You Didn&apos;t Come This Far By Giving Up.
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
          When you become a DigitalFlyer member, you get more than just a professional business
          page. You also get access to a serious, private business community built for real
          growth.
        </p>
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-brand-dark shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-gray-100"
          >
            Message Us on WhatsApp to Join →
          </a>
        )}
      </div>
    </section>
  );
}
