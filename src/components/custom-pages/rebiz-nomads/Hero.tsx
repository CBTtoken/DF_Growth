import Link from "next/link";

// Consolidated Sprint Sec 3.1: a WhatsApp CTA was never the right fit here
// — WhatsApp is reserved as a Growth onboarding entry channel, and RE:Biz
// Nomads isn't joined independently, it's a bundled benefit of Growth
// membership. Replaced with a CTA that sends visitors to actually become a
// member, framed around what that unlocks (the Deal Room, the community),
// not a generic "join Growth" pitch.
export function Hero() {
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
        <Link
          href="/pricing"
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-brand-dark shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-gray-100"
        >
          Join DigitalFlyer Growth to Unlock This →
        </Link>
      </div>
    </section>
  );
}
