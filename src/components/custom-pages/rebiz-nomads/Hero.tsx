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
    <section className="flex flex-col items-center gap-6 bg-white px-6 pb-20 pt-28 text-center">
      <span className="font-badge text-xs uppercase tracking-[0.25em] text-brand">
        Powered by DigitalFlyer SA — We Use What We Sell
      </span>
      <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
        You Didn&apos;t Come This Far By Giving Up.
      </h1>
      <p className="max-w-xl text-base leading-relaxed text-gray-500 sm:text-lg">
        When you become a DigitalFlyer member, you get more than just a professional business
        page. You also get access to a serious, private business community built for real growth.
      </p>
      {whatsappHref && (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-brand px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark"
        >
          Message Us on WhatsApp to Join →
        </a>
      )}
    </section>
  );
}
