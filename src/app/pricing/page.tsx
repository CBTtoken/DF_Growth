import { TIERS } from "@/lib/paystack/plans";
import { TierCard } from "@/components/pricing/tier-card";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { HeroSwoosh } from "@/components/brand/HeroSwoosh";
import { EcosystemAccess } from "@/components/EcosystemAccess";

export default function PricingPage() {
  return (
    <main className="flex flex-1 flex-col">
      <MarketingHeader />

      {/* Hero — full-bleed dark block, not a thin accent, per the brand
          directive's push against the generic pale-blue-on-white template
          look. Barlow Condensed at real scale carries the "no fluff, direct"
          voice better than a safe corporate sans ever could. */}
      <section className="relative overflow-hidden bg-ink px-6 py-24 text-center sm:py-32">
        <HeroSwoosh />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6">
          <h1 className="font-display text-4xl uppercase leading-[1.05] tracking-tight text-white sm:text-6xl">
            Built by someone who gets what it&apos;s like to do it all yourself.
          </h1>
          <p className="max-w-xl text-lg text-white/80">
            Real pages, real tracking, and a plan that starts wherever your budget actually is.
            No contracts, no jargon, no empty agency promises.
          </p>
          <a
            href="#pricing"
            className="mt-2 rounded-full bg-spark px-8 py-3 text-base font-semibold text-ink transition hover:bg-spark-dark hover:text-white"
          >
            See what fits your business
          </a>
        </div>
      </section>

      {/* Why we're different — the two real structural advantages, no
          manufactured feature icons pretending this is an enterprise tool. */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto grid max-w-4xl gap-10 sm:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl uppercase tracking-wide text-ink">
              Not just a page. A foothold.
            </h2>
            <p className="mt-3 text-gray-600">
              A Growth client sits inside DigitalFlyer SA&apos;s existing business directory and
              RE:Biz Nomads community, not just a design portfolio somewhere. That&apos;s
              distribution most local agencies simply don&apos;t have to offer.
            </p>
          </div>
          <div>
            <h2 className="font-display text-2xl uppercase tracking-wide text-ink">
              No budget gatekeeping.
            </h2>
            <p className="mt-3 text-gray-600">
              Most agencies only know how to sell what they&apos;re built to sell, usually ad
              management, so a business with no ad budget gets turned away or oversold. Growth
              starts exactly where you are, and grows into the rest when you&apos;re ready, not
              before.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing — the plain-language explainer above the cards does the
          persuading; the cards themselves just need to be scannable. */}
      <section id="pricing" className="bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl uppercase tracking-wide text-ink">
              Start with what you&apos;ve got.
            </h2>
            <p className="mt-3 text-gray-600">
              Foundation: a real, converting page and branded content, no ad budget needed.
              Growth Engine: everything in Foundation, plus your ad tracking actually working the
              way it&apos;s supposed to. Enterprise: a fully custom build for businesses ready to
              go further.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {TIERS.map((t) => (
              <TierCard
                key={t.id}
                tier={t.id}
                name={t.name}
                priceLabel={t.priceLabel}
                description={t.description}
                features={t.features}
                highlighted={t.id === "growth_engine"}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Ecosystem access — the wider DigitalFlyer SA brand, not just the
          Growth product on its own. Kept honest: marketplace listing is a
          real manual/concierge process, not instant automation, so this
          routes through WhatsApp rather than implying a self-serve form. */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl uppercase tracking-wide text-ink">
              What you also get access to.
            </h2>
            <p className="mt-3 text-gray-600">
              Growth is part of the wider DigitalFlyer SA ecosystem — every client can also tap
              into these.
            </p>
          </div>
          <div className="mt-10">
            <EcosystemAccess />
          </div>
        </div>
      </section>

      {/* Footer CTA — bookends the hero with the same dark treatment. */}
      <section className="bg-ink px-6 py-16 text-center">
        <h2 className="font-display text-2xl uppercase tracking-wide text-white sm:text-3xl">
          Start with what you&apos;ve got. Grow from there.
        </h2>
        <a
          href="#pricing"
          className="mt-6 inline-block rounded-full bg-spark px-8 py-3 text-base font-semibold text-ink transition hover:bg-spark-dark hover:text-white"
        >
          See what fits your business
        </a>
      </section>
    </main>
  );
}
