export function Closing() {
  return (
    <footer className="flex flex-col items-center gap-8 bg-[#16213E] px-6 py-24 text-center text-white">
      <p className="max-w-xl font-[family-name:var(--font-s365-serif)] text-xl italic leading-relaxed text-white/85">
        &ldquo;Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give
        up.&rdquo;
        <span className="mt-2 block text-xs font-semibold not-italic uppercase tracking-[0.25em] text-[#D6A857]">
          Galatians 6:9
        </span>
      </p>

      <p className="max-w-md text-sm leading-relaxed text-white/60">
        You are not alone. And there is always a next step.
      </p>

      <a
        href="#own-a-copy"
        className="inline-flex items-center justify-center rounded-full bg-[#B8832A] px-8 py-3.5 text-sm font-semibold text-[#16213E] shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-[#D6A857]"
      >
        Get Your Copy
      </a>

      <div className="mt-6 flex flex-col items-center gap-1 border-t border-white/10 pt-8 text-xs text-white/50">
        <p className="font-[family-name:var(--font-s365-serif)] text-base text-white/80">Standing 365</p>
        <p>by Dewald Rosema (AM I&hellip;)</p>
        <p className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <a href="mailto:dewald@digitalflyer.co.za" className="underline-offset-2 hover:text-white hover:underline">
            dewald@digitalflyer.co.za
          </a>
          <span aria-hidden>&middot;</span>
          <a
            href="https://wa.me/27723110570"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 hover:text-white hover:underline"
          >
            WhatsApp +27 72 311 0570
          </a>
        </p>
      </div>
    </footer>
  );
}
