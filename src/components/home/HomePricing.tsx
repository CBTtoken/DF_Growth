import { TIERS } from "@/lib/paystack/plans";
import { TierCard } from "@/components/pricing/tier-card";

// Bolt-styled pricing section chrome wrapped around the REAL, functional
// TierCard components (email capture, slug check, consent, Paystack, agent
// referral). The Bolt mockup's pricing cards were static with dead buttons;
// keeping the working cards is the deliberate trade for a live home page.
export function HomePricing() {
  return (
    <section id="pricing" className="bg-white py-10 lg:py-14 border-b border-neutral-border scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 lg:mb-8 max-w-xl">
          <p className="section-eyebrow">Pricing</p>
          <h2 className="section-heading text-2xl lg:text-3xl">Start Where Your Business Is Today</h2>
          <p className="mt-1.5 text-sm text-neutral-mid leading-relaxed">
            You don&apos;t need a huge budget or an expensive agency. Choose the package that fits today,
            upgrade whenever you&apos;re ready.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 items-stretch">
          {TIERS.map((t) => (
            <TierCard
              key={t.id}
              tier={t.id}
              name={t.name}
              priceLabel={t.priceLabel}
              description={t.description}
              features={t.features}
              ctaLabel={t.ctaLabel}
              highlighted={t.id === "growth_engine"}
            />
          ))}
        </div>

        {/* The R450 done-for-you offer, 4 August 2026, made unmissable the
            same day at Dewald's ask: a full brand band with a real button,
            not a strip that scrolls past. Sits directly under the packages
            because the moment somebody compares tiers is the moment they
            think "this looks like effort". Same words as the legacy
            mailer, so a mailer click lands on a page repeating the offer.
            The button leads to the packages because the R450 only exists
            attached to a membership; the tick itself lives inside signup. */}
        <div className="mt-6 rounded-2xl bg-brand px-6 py-7 text-white shadow-lg sm:px-9">
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
            <a
              href="#pricing"
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-7 py-3.5 text-base font-bold text-brand shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              Get started, we build it →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
