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

        {/* The R450 done-for-you offer, 4 August 2026. Sits directly under
            the packages because the moment somebody compares tiers is the
            moment they think "this looks like effort". Same words as the
            legacy mailer, so a mailer click lands on a page that repeats
            the offer it made. */}
        <div className="mt-5 rounded-2xl border border-brand/25 bg-brand/5 px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div>
              <p className="text-base font-bold text-ink">
                No time, or want an extra creative touch? We build it for you.
              </p>
              <p className="mt-1 text-sm leading-relaxed text-neutral-mid">
                Once-off <strong className="text-ink">R450</strong>: pick your package, tick{" "}
                <em>Build it for me</em> when you sign up, and send us your information. We set up
                the whole page and hand it over with a step-by-step guide, so running it yourself
                afterwards is easy. Nothing extra is charged at signup.
              </p>
            </div>
            <a
              href="#pricing"
              className="inline-flex shrink-0 items-center justify-center rounded-full border border-brand px-5 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white"
            >
              Pick a package to start
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
