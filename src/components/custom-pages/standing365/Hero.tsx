export function Hero() {
  return (
    <section className="flex min-h-[92vh] flex-col items-center justify-center gap-8 bg-[#16213E] px-6 py-24 text-center text-white">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#D6A857]">A book for the real life</p>
      <h1 className="font-[family-name:var(--font-s365-serif)] text-5xl leading-[1.05] tracking-tight sm:text-7xl">Standing 365</h1>
      <p className="max-w-xl border-l-2 border-[#B8832A] pl-5 text-left font-[family-name:var(--font-s365-serif)] text-lg italic leading-relaxed text-white/85 sm:text-xl">
        Not for the people who have it all together. For everyone still standing in the middle of the hard thing.
      </p>
      <p className="max-w-md text-sm leading-relaxed text-white/60">
        365 daily devotions for real people, in real hard seasons.
      </p>

      <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row">
        <a
          href="#own-a-copy"
          className="inline-flex items-center justify-center rounded-full bg-[#B8832A] px-8 py-3.5 text-sm font-semibold text-[#16213E] shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-[#D6A857]"
        >
          Get Your Copy
        </a>
        <a
          href="#about"
          className="inline-flex items-center justify-center rounded-full border border-white/25 px-8 py-3.5 text-sm font-semibold text-white/90 transition hover:-translate-y-0.5 hover:border-white/50"
        >
          Read more about the book
        </a>
      </div>

      <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/45">
        Paperback pre-order &middot; Personalised gift edition available &middot; Ships nationwide
      </p>
    </section>
  );
}
