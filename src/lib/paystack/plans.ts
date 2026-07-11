export type Tier = "foundation" | "growth_engine" | "enterprise";
// Only growth_engine offers a choice — Foundation's only plan is its
// post-trial R100/month, Enterprise has no live checkout yet. Present for
// every tier for a uniform call signature; ignored otherwise.
export type BillingInterval = "monthly" | "annual";

export const TIERS: {
  id: Tier;
  name: string;
  priceLabel: string;
  description: string;
  features: string[];
}[] = [
  {
    id: "foundation",
    name: "Foundation",
    priceLabel: "Free for 7 days, then R100/month",
    description: "For businesses not ready to run paid ads yet. No card needed to start.",
    features: [
      "Conversion-optimized landing page",
      "Brand kit",
      "Monthly programmatic social asset generation",
      "You post the assets yourself, manually",
    ],
  },
  {
    id: "growth_engine",
    name: "Growth",
    priceLabel: "R180/month or R1,199/year",
    description: "Everything in Foundation, plus managed Meta ad tracking.",
    features: [
      "Everything in Foundation",
      "Meta CAPI tracking",
      "Weekly asset generation",
      "Managed campaign monitoring",
      "Monthly performance summary",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceLabel: "Coming soon",
    description: "Full Meta + Google ad management for businesses ready to go further.",
    features: [
      "Everything in Growth",
      "Custom multi-page site",
      "Full ad account management, both platforms",
      "Featured marketplace placement",
      "Priority support",
    ],
  },
];

function planCodeEnvVar(tier: Tier, interval: BillingInterval): string {
  if (tier === "foundation") return "PAYSTACK_PLAN_FOUNDATION";
  if (tier === "enterprise") return "PAYSTACK_PLAN_ENTERPRISE";
  return interval === "annual" ? "PAYSTACK_PLAN_GROWTH_ANNUAL" : "PAYSTACK_PLAN_GROWTH_MONTHLY";
}

export function planCodeForTier(tier: Tier, interval: BillingInterval = "monthly"): string {
  const envVar = planCodeEnvVar(tier, interval);
  const code = process.env[envVar];
  if (!code) throw new Error(`Missing env var ${envVar}`);
  return code;
}

// Paystack's transaction/initialize requires an explicit amount even when a
// plan is attached (confirmed against the live API — it does not derive the
// amount from the plan). Fetching it here instead of hardcoding it keeps the
// price genuinely sourced from Paystack's Plan config, matching CLAUDE.md
// Section 2.2 ("amount lives in Paystack's Plan configuration, not
// hardcoded in the app").
export async function amountForTier(tier: Tier, interval: BillingInterval = "monthly"): Promise<number> {
  const planCode = planCodeForTier(tier, interval);
  const res = await fetch(`https://api.paystack.co/plan/${planCode}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  const data = await res.json();
  if (!data.status || typeof data.data?.amount !== "number") {
    throw new Error(`Could not fetch amount for plan ${planCode}`);
  }
  return data.data.amount;
}
