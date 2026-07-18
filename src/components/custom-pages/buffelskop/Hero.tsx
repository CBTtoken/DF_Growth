import Image from "next/image";

// Full-bleed hero uses the supplied composite shot as-is (both grinds, the
// milled bowl, and the brand's own "Pure Heat. Natural Flavour." wordmark
// baked into the bottom of the frame) — the overlay is heaviest at the top,
// where this section's own headline sits, and fades out by the lower third
// so the brand's own signature line reads clearly rather than being
// covered by a second, competing line of text.
export function Hero() {
  return (
    <section className="relative flex min-h-[94vh] flex-col justify-center overflow-hidden px-6 py-28 text-center text-white">
      <Image
        src="/custom-pages/buffelskop/hero-composite.jpg"
        alt="Buffelskop premium sundried cayenne chilli powder, fine and coarse, hand-picked and naturally sun-dried"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/45 to-black/20"
      />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6">
        <p className="font-[family-name:var(--font-buffelskop-serif)] text-sm uppercase tracking-[0.4em] text-[#E7B36A]">
          🌶️ Premium Sundried Cayenne Chilli Powder
        </p>
        <h1 className="font-[family-name:var(--font-buffelskop-serif)] text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
          Naturally Dried.
          <br />
          Hand Picked.
          <br />
          Packed With Flavour.
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
          Available in Fine or Coarse powder. From only <span className="font-semibold text-[#E7B36A]">R80 per kg</span>.
        </p>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
          Premium Quality &middot; Preservative Free &middot; Bulk Orders Welcome
        </p>

        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
          <a
            href="#lead-form"
            className="inline-flex items-center justify-center rounded-full bg-[#A62F1D] px-9 py-3.5 text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-black/40 transition hover:-translate-y-0.5 hover:bg-[#8A2717]"
          >
            Order Now
          </a>
          <a
            href="#lead-form"
            className="inline-flex items-center justify-center rounded-full border border-white/40 px-9 py-3.5 text-sm font-semibold uppercase tracking-wide text-white transition hover:-translate-y-0.5 hover:border-white/70"
          >
            Request Bulk Pricing
          </a>
        </div>

        <p className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/75">
          <span>📍 Lindleyspoort / Rustenburg, South Africa</span>
          <span>🚚 Nationwide Courier Available</span>
        </p>
      </div>
    </section>
  );
}
