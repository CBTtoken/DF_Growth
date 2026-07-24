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
      </div>
    </section>
  );
}
