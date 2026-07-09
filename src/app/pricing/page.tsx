import { TIERS } from "@/lib/paystack/plans";
import { TierCard } from "@/components/pricing/tier-card";
import { BrandHeader } from "@/components/brand/BrandHeader";

export default function PricingPage() {
  return (
    <main className="flex flex-1 flex-col items-center px-4 py-16">
      <BrandHeader />

      <div className="mt-10 max-w-3xl text-center">
        <h1 className="text-3xl font-semibold text-foreground">
          Built and hosted in Cape Town, live in days, priced for a small business.
        </h1>
      </div>

      <div className="mt-12 grid w-full max-w-5xl gap-6 sm:grid-cols-3">
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
    </main>
  );
}
