// STANDING365_LANDING_BUILD_SPEC_CLAUDE.md Sprint 1: static content only,
// "no order logic yet" — Standard and Personalised are honest placeholders
// until Sprint 2 wires up the real order form + Paystack flow. Kindle is a
// pure external link, live from day one, no data capture needed.
const OPTIONS = [
  {
    key: "standard",
    name: "Standard Paperback",
    price: "R299",
    delivery: "+ R75 delivery nationwide",
    description: "The full 365-day devotional, printed and shipped to your door.",
    highlight: false,
  },
  {
    key: "personalised",
    name: "Personalised Paperback",
    price: "R385",
    delivery: "+ R75 delivery nationwide",
    description: "Your recipient's name on the cover and a personal message printed inside the front cover.",
    highlight: true,
  },
] as const;

export function OwnACopy() {
  return (
    <section id="own-a-copy" className="bg-[#FBF8F3] px-6 py-24">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#B8832A]">Own a copy</p>
          <h2 className="font-[family-name:var(--font-s365-serif)] text-3xl text-[#16213E] sm:text-4xl">Get your copy of Standing 365</h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {OPTIONS.map((opt) => (
            <div
              key={opt.key}
              className={`relative flex flex-col gap-4 rounded-2xl border bg-white p-8 ${
                opt.highlight ? "border-[#B8832A] shadow-lg shadow-[#B8832A]/10" : "border-[#16213E]/10"
              }`}
            >
              {opt.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#B8832A] px-4 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                  Most special
                </span>
              )}
              <h3 className="font-[family-name:var(--font-s365-serif)] text-xl text-[#16213E]">{opt.name}</h3>
              <div>
                <span className="font-[family-name:var(--font-s365-serif)] text-3xl text-[#16213E]">{opt.price}</span>
                <span className="ml-1 text-xs text-[#2E2A22]/60">{opt.delivery}</span>
              </div>
              <p className="flex-1 text-sm leading-relaxed text-[#2E2A22]/80">{opt.description}</p>
              <button
                type="button"
                disabled
                title="Order form opens soon"
                className="cursor-not-allowed rounded-full border border-[#16213E]/15 bg-[#16213E]/5 px-6 py-3 text-sm font-semibold text-[#16213E]/50"
              >
                Order form opens soon
              </button>
            </div>
          ))}

          <div className="flex flex-col gap-4 rounded-2xl border border-[#16213E]/10 bg-white p-8">
            <h3 className="font-[family-name:var(--font-s365-serif)] text-xl text-[#16213E]">Kindle eBook</h3>
            <div>
              <span className="font-[family-name:var(--font-s365-serif)] text-3xl text-[#16213E]">Amazon</span>
            </div>
            <p className="flex-1 text-sm leading-relaxed text-[#2E2A22]/80">
              Available immediately, no pre-order wait. Delivered straight to your Kindle.
            </p>
            <a
              href="https://www.amazon.com/dp/B0H298566F"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-[#16213E] px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#233158]"
            >
              Get it on Amazon
            </a>
          </div>
        </div>

        <p className="mx-auto max-w-xl text-center text-xs leading-relaxed text-[#2E2A22]/60">
          Paperback pre-orders are printed and shipped in batches of 50. If your order falls in a later batch,
          you&rsquo;ll be notified immediately and kept updated until it ships.
        </p>
      </div>
    </section>
  );
}
