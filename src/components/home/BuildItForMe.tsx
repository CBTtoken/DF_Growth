import Link from "next/link";

// The R450 done-for-you offer. On the pricing page it sits under the
// packages, where comparing tiers turns into "this looks like effort". The
// home page split handoff promotes it to a section of its own on the home
// page too: for a time-poor operator it is the strongest offer on the site.
// One component, two placements, so the words can never drift apart. Same
// words as the legacy mailer, so a mailer click lands on a page repeating
// the offer.
//
// Sprint "Onboarding two doors", 7 August 2026: this used to promise that
// nothing extra was charged at signup and that the R450 would be "arranged
// when we make contact". It is now a real product with its own door and its
// own checkout (/pricing/build), so the words describe what actually
// happens: one payment, one form, a page inside three working days.
//
// The href prop is gone with that change. It existed to send people to the
// plan cards, "#pricing" or "/pricing#pricing" depending on the page, so
// they could hunt for a tick inside signup. There is now one destination
// from everywhere, so passing it per call site could only introduce a way
// to get it wrong.
export function BuildItForMe() {
  return (
    <div className="rounded-2xl bg-brand px-6 py-7 text-white shadow-lg sm:px-9">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <div>
          <p className="text-xl font-extrabold tracking-tight sm:text-2xl">
            No time, or want an extra creative touch? We build it for you.
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85">
            Once-off <strong className="text-white">R450</strong> with any plan. Fill in one short
            form, pay once for the build and your first period together, and we set up the whole
            page for you: the right look for your trade, your photos sorted, and your own words
            turned into proper copy. Live within 3 working days, and easy to run yourself
            afterwards.
          </p>
        </div>
        <Link
          href="/pricing/build"
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-7 py-3.5 text-base font-bold text-brand shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          Get started, we build it →
        </Link>
      </div>
    </div>
  );
}
