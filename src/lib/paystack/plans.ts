export type Tier = "foundation" | "growth_engine" | "enterprise";

export const TIERS: {
  id: Tier;
  name: string;
  priceLabel: string;
  planCodeEnvVar: string;
  description: string;
  features: string[];
}[] = [
  {
    id: "foundation",
    name: "Foundation",
    priceLabel: "R550/month",
    planCodeEnvVar: "PAYSTACK_PLAN_FOUNDATION",
    description: "For businesses not ready to run paid ads yet.",
    features: [
      "Conversion-optimized landing page",
      "Brand kit",
      "Monthly programmatic social asset generation",
      "You post the assets yourself, manually",
    ],
  },
  {
    id: "growth_engine",
    name: "Growth Engine",
    priceLabel: "R1,400/month",
    planCodeEnvVar: "PAYSTACK_PLAN_GROWTH_ENGINE",
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
    priceLabel: "R3,500/month",
    planCodeEnvVar: "PAYSTACK_PLAN_ENTERPRISE",
    description: "Everything in Growth Engine, plus a custom multi-page site.",
    features: [
      "Everything in Growth Engine",
      "Custom multi-page site",
      "Dedicated infrastructure isolation",
      "Featured marketplace placement",
      "Priority support",
    ],
  },
];

function tierEntry(tier: Tier) {
  const entry = TIERS.find((t) => t.id === tier);
  if (!entry) throw new Error(`Unknown tier: ${tier}`);
  return entry;
}

export function planCodeForTier(tier: Tier): string {
  const entry = tierEntry(tier);
  const code = process.env[entry.planCodeEnvVar];
  if (!code) throw new Error(`Missing env var ${entry.planCodeEnvVar}`);
  return code;
}

// Paystack's transaction/initialize requires an explicit amount even when a
// plan is attached (confirmed against the live API — it does not derive the
// amount from the plan). Fetching it here instead of hardcoding it keeps the
// price genuinely sourced from Paystack's Plan config, matching CLAUDE.md
// Section 2.2 ("amount lives in Paystack's Plan configuration, not
// hardcoded in the app").
export async function amountForTier(tier: Tier): Promise<number> {
  const planCode = planCodeForTier(tier);
  const res = await fetch(`https://api.paystack.co/plan/${planCode}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  const data = await res.json();
  if (!data.status || typeof data.data?.amount !== "number") {
    throw new Error(`Could not fetch amount for plan ${planCode}`);
  }
  return data.data.amount;
}
