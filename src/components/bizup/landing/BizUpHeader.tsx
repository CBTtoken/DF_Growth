import Link from "next/link";

// BizUp's top navigation, matching MarketingHeader's pattern on Growth:
// brand on the left, quiet text links that collapse away on small screens,
// and the one real action as a button that never collapses.
//
// The links are in-page anchors rather than routes, because this is a
// single-page landing. On a phone they hide and the sticky bottom CTA does
// the work, which is the same trade Growth's own header makes.
export function BizUpHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/bizup" className="flex shrink-0 items-baseline gap-2">
          <span className="text-xl font-extrabold tracking-tight text-neutral-ink sm:text-2xl">
            BizUp
          </span>
          <span className="hidden h-4 w-px bg-neutral-border sm:block" />
          <span className="hidden text-[11px] font-medium uppercase tracking-widest text-neutral-muted sm:block">
            DigitalFlyer SA
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-1.5 sm:gap-4">
          <a
            href="#how-it-works"
            className="hidden whitespace-nowrap text-xs font-medium text-neutral-mid transition hover:text-brand-blue sm:inline sm:text-sm"
          >
            How it works
          </a>
          <a
            href="#pricing"
            className="hidden whitespace-nowrap text-xs font-medium text-neutral-mid transition hover:text-brand-blue sm:inline sm:text-sm"
          >
            Pricing
          </a>
          <a
            href="#faq"
            className="hidden whitespace-nowrap text-xs font-medium text-neutral-mid transition hover:text-brand-blue sm:inline sm:text-sm"
          >
            FAQ
          </a>
          <Link
            href="/bizup/login"
            className="whitespace-nowrap text-xs font-medium text-neutral-mid transition hover:text-brand-blue sm:text-sm"
          >
            Log in
          </Link>
          <Link href="/bizup/signup" className="btn-accent px-4 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm">
            Start free
          </Link>
        </nav>
      </div>
    </header>
  );
}
