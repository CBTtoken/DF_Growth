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
  ctaLabel: string;
}[] = [
  {
    // Sprint 1, Build Item 1 (2026-07-11): Foundation is never eligible for
    // founding-member status — that's Growth-annual only, confirmed by
    // Dewald. Was "Founding Foundation" / "Become a Founding Business",
    // which actively claimed the opposite of the real mechanic. Renamed to
    // remove the false claim rather than leave it and rely on a disclaimer.
    id: "foundation",
    name: "Foundation",
    priceLabel: "Free for 7 days, then R100/month",
    description: "Perfect for businesses ready to build a professional online presence.",
    features: [
      "Professional Business Page",
      "Marketplace Listing",
      "Lead Generation Page",
      "Business Profile",
      "Monthly Digital Asset",
      "Ready To Share Anywhere",
      // Combined spec Sec 16: bundled into every tier at no extra cost, but
      // previously only mentioned (Marketplace and RE:Biz Nomads) or not at
      // all (BizUp) in a separate section near the footer — a prospect
      // looking at just this card never saw the full value included.
      "RE:Biz Nomads Community",
      "BizUp In-Chat Payments",
    ],
    ctaLabel: "Start Your Free Trial",
  },
  {
    id: "growth_engine",
    name: "Growth",
    priceLabel: "R180/month or R1,199/year",
    description: "Ready to reach more customers? Everything in Foundation, plus:",
    features: [
      "Campaign Landing Pages",
      "Performance Tracking",
      "Marketing Assets",
      "Monthly Optimisation",
      "Growth Reporting",
      // Dewald's ask, 2026-07-18: Booking & Shop are real Growth-and-above
      // features (docs/GROWTH_BOOKING_SHOP_MODULES_CLAUDE.md) but weren't
      // named on the card itself, only in a separate section below the
      // pricing cards — a prospect comparing tiers side by side never saw
      // this as something Growth specifically unlocks over Foundation.
      "Booking & Shop Tools",
      // Combined spec Sec 16: this card's own feature list didn't repeat
      // what "Everything in Foundation" already includes, so a prospect
      // comparing tiers side by side never saw these three on the Growth
      // card at all.
      "Marketplace Listing",
      "RE:Biz Nomads Community",
      "BizUp In-Chat Payments",
    ],
    ctaLabel: "Start Growing",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceLabel: "Coming soon",
    description: "For businesses ready to scale. Everything in Growth, plus:",
    features: ["Advanced Campaign Management", "Priority Support", "Custom Solutions"],
    ctaLabel: "Contact Us",
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
