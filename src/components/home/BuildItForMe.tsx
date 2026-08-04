import Link from "next/link";

// The R450 done-for-you offer. On the pricing page it sits under the
// packages, where comparing tiers turns into "this looks like effort". The
// home page split handoff promotes it to a section of its own on the home
// page too: for a time-poor operator it is the strongest offer on the site.
// One component, two placements, so the words can never drift apart. Same
// words as the legacy mailer, so a mailer click lands on a page repeating
// the offer.
//
// href is where the button sends people: "#pricing" when the plan cards are
// on the same page, "/pricing" when they are not. The R450 only exists
// attached to a membership; the tick itself lives inside signup.
export function BuildItForMe({ href }: { href: string }) {
  return (
    <div className="rounded-2xl bg-brand px-6 py-7 text-white shadow-lg sm:px-9">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <div>
          <p className="text-xl font-extrabold tracking-tight sm:text-2xl">
            No time, or want an extra creative touch? We build it for you.
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85">
            Once-off <strong className="text-white">R450</strong> with any package. Pick your
            package, tick <em>Build it for me</em> at signup, send us your information, and we
            set up the whole page for you, with a step-by-step guide so running it yourself
            afterwards is easy. Nothing extra is charged at signup; we arrange the R450 when
            we make contact, within a day.
          </p>
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-7 py-3.5 text-base font-bold text-brand shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          Get started, we build it →
        </Link>
      </div>
    </div>
  );
}
