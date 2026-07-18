const SIZES = ["500g", "1kg", "5kg", "10kg", "25kg", "Bulk quantities"];

export function Pricing() {
  return (
    <section className="bg-[#F8F1E4] px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#A62F1D]">Simple Pricing</p>
        <h2 className="mt-3 font-[family-name:var(--font-buffelskop-serif)] text-3xl font-semibold tracking-tight text-[#2B2118] sm:text-4xl">
          One Price. Two Grinds. No Surprises.
        </h2>
      </div>

      <div className="mx-auto mt-12 max-w-md overflow-hidden rounded-3xl border border-[#E4C99A] bg-white shadow-2xl shadow-black/10">
        <div className="bg-[#A62F1D] px-8 py-8 text-center text-white">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-white/80">
            Premium Sundried Cayenne Chilli Powder
          </p>
          <p className="mt-3 font-[family-name:var(--font-buffelskop-serif)] text-5xl font-semibold">
            R80<span className="text-xl font-medium text-white/85"> / kg</span>
          </p>
        </div>

        <div className="flex flex-col gap-6 px-8 py-8">
          <div className="flex justify-center gap-3">
            <span className="rounded-full bg-[#F8F1E4] px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#2B2118]">
              📦 Fine Powder
            </span>
            <span className="rounded-full bg-[#F8F1E4] px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#2B2118]">
              📦 Coarse Powder
            </span>
          </div>

          <div>
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.25em] text-[#8B6339]">
              Available in
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SIZES.map((size) => (
                <span
                  key={size}
                  className="rounded-full border border-[#E4C99A] px-3.5 py-1 text-sm font-medium text-[#4A3B2E]"
                >
                  {size}
                </span>
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-[#8B6339]">Bulk pricing available on request.</p>

          <a
            href="#lead-form"
            className="mt-2 inline-flex items-center justify-center rounded-full bg-[#A62F1D] px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#8A2717]"
          >
            Request Bulk Pricing
          </a>
        </div>
      </div>
    </section>
  );
}
