import Image from "next/image";

const FEATURES = [
  { icon: "🌶", label: "Hand Picked" },
  { icon: "☀", label: "Naturally Sun-Dried" },
  { icon: "🌱", label: "Preservative Free" },
  { icon: "🔥", label: "Rich Flavour & Heat" },
  { icon: "📦", label: "Fine & Coarse Powder" },
  { icon: "🚚", label: "Nationwide Delivery" },
];

export function NatureSection() {
  return (
    <section className="bg-[#F8F1E4] px-6 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl shadow-2xl shadow-black/20 lg:order-1">
          <Image
            src="/custom-pages/buffelskop/coarse-bag.jpg"
            alt="Buffelskop chilli powder bag among freshly picked cayenne chillies"
            fill
            sizes="(min-width: 1024px) 45vw, 90vw"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col gap-5 lg:order-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#A62F1D]">Our Process</p>
          <h2 className="font-[family-name:var(--font-buffelskop-serif)] text-3xl font-semibold tracking-tight text-[#2B2118] sm:text-4xl">
            Nature Does It Best
          </h2>
          <p className="text-base leading-relaxed text-[#4A3B2E]">
            Every chilli is hand-picked and naturally sun-dried before being milled into
            premium-quality powder.
          </p>
          <p className="text-base leading-relaxed text-[#4A3B2E]">
            We don&apos;t use preservatives. We don&apos;t use artificial additives. Just clean,
            naturally dried cayenne chillies that deliver exceptional flavour, vibrant colour and
            consistent heat.
          </p>
          <p className="text-base leading-relaxed text-[#4A3B2E]">
            Whether you&apos;re cooking at home or supplying the food industry, our chilli powder
            is produced with quality in mind from start to finish.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-16 grid max-w-6xl grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
        {FEATURES.map((f) => (
          <div
            key={f.label}
            className="flex flex-col items-center gap-2 rounded-2xl border border-[#E4C99A] bg-white px-4 py-7 text-center shadow-sm shadow-black/5 transition hover:-translate-y-1 hover:shadow-md"
          >
            <span className="text-2xl" aria-hidden>
              {f.icon}
            </span>
            <span className="text-sm font-semibold text-[#2B2118]">{f.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
