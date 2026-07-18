import Image from "next/image";

const BUYERS = ["Home cooks", "Restaurants", "Butcheries", "Retailers", "Spice manufacturers", "Food producers", "Wholesale buyers"];

export function BulkBanner() {
  return (
    <section className="relative flex min-h-[70vh] items-center overflow-hidden px-6 py-24 text-white">
      <Image
        src="/custom-pages/buffelskop/hero-composite.jpg"
        alt="Buffelskop bulk chilli powder supply, four tonnes available"
        fill
        sizes="100vw"
        className="object-cover object-top"
      />
      <div aria-hidden className="absolute inset-0 bg-black/75" />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <h2 className="font-[family-name:var(--font-buffelskop-serif)] text-3xl font-semibold uppercase tracking-wide sm:text-5xl">
          From Small Orders To Bulk Supply
        </h2>
        <p className="max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
          Whether you need a single kilogram or multiple tonnes, we&apos;re ready to supply.
        </p>
        <p className="max-w-2xl text-base leading-relaxed text-[#E7B36A]">
          Over 4 tonnes of premium sundried cayenne chilli powder is available, making us the ideal
          partner for:
        </p>
        <ul className="flex flex-wrap justify-center gap-x-3 gap-y-3">
          {BUYERS.map((b) => (
            <li
              key={b}
              className="rounded-full border border-white/25 px-4 py-1.5 text-sm font-medium text-white/90"
            >
              {b}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
          No order is too small or too large
        </p>
      </div>
    </section>
  );
}
