import { TIERS } from "@/lib/paystack/plans";
import { TierCard } from "@/components/pricing/tier-card";
import { BuildItForMe } from "@/components/home/BuildItForMe";

// The full pricing section: the REAL, functional TierCard components (email
// capture, slug check, consent, Paystack, agent referral) with the R450
// band under them.
//
// Home page split handoff, 4 Aug 2026: Enterprise comes out of the
// three-column row. Three columns where one cannot be bought makes the
// choice harder, so the grid holds Foundation and Growth only and
// Enterprise is one line of text with the contact link. It stays in TIERS
// itself because checkout plumbing references all three tiers.
export function HomePricing() {
  const purchasable = TIERS.filter((t) => t.id !== "enterprise");

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 items-stretch max-w-4xl">
          {purchasable.map((t) => (
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

        <p className="mt-4 text-sm text-neutral-mid">
          Enterprise, with full Meta and Google ad management, is on its way for businesses ready to
          scale.{" "}
          <a
            href="mailto:info@digitalflyer.co.za?subject=Enterprise%20waitlist"
            className="font-bold text-brand-blue hover:text-brand-blue-dark transition-colors"
          >
            Get in touch
          </a>{" "}
          and we&apos;ll let you know the moment it&apos;s ready.
        </p>

        <div className="mt-6">
          <BuildItForMe />
        </div>
      </div>
    </section>
  );
}
