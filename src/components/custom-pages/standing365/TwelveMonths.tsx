const TOPICS = [
  "New Beginnings",
  "Relationships",
  "Purpose",
  "Provision",
  "Faith and Doubt",
  "Identity",
  "Calling and Work",
  "Mental Health",
  "Community",
  "Perseverance",
  "Gratitude and Hope",
  "Legacy and Eternity",
];

export function TwelveMonths() {
  return (
    <section className="bg-[#16213E] px-6 py-24">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#D6A857]">Twelve months</p>
          <h2 className="font-[family-name:var(--font-s365-serif)] text-3xl text-white sm:text-4xl">Twelve honest conversations</h2>
          <p className="max-w-lg text-sm leading-relaxed text-white/60">
            One theme a month, every one of them a season most people go through and rarely talk about out loud.
          </p>
        </div>

        <ul className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
          {TOPICS.map((topic, i) => (
            <li
              key={topic}
              className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-4 text-center transition hover:border-[#B8832A]/50 hover:bg-white/[0.07]"
            >
              <span className="font-[family-name:var(--font-s365-serif)] text-xs text-[#D6A857]">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-sm font-medium text-white/90">{topic}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
