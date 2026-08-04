export type Tier = "foundation" | "growth_engine" | "enterprise";
// Foundation gained an annual option 2026-07-19 (PLN_qf1kh46lwn5jxr1,
// R900/year) — Enterprise still has no live checkout, so this field is
// ignored there. Present for every tier for a uniform call signature.
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
    priceLabel: "Free for 7 days, then R100/month or R900/year",
    description: "Perfect for businesses ready to build a professional online presence.",
    // Home page split handoff, 4 Aug 2026: plain-language pass on every
    // bullet, each checked against the live code first. A bullet that maps
    // to a real feature is written the way a tradesman would picture it; a
    // bullet that does not map to anything real is kept word for word and
    // flagged to Dewald in the report, never quietly reworded into
    // something better sounding.
    features: [
      "A professional page for your business, at its own link",
      "A place on the DigitalFlyer marketplace, where customers browse local businesses",
      "A contact form that sends customer enquiries straight to you",
      "Your services, prices and contact details, all in one place",
      // Not matched to anything in the code that delivers an asset monthly.
      // Kept as written and flagged in the report.
      "Monthly Digital Asset",
      "One link you can share on WhatsApp, Facebook or anywhere else",
      "The KatisoBiz Nomads community of business owners",
      // Site audit, 28 July 2026: this read as an unqualified bullet on
      // both Foundation and Growth, while the entitlement genuinely
      // differs. bizUpEntitlementForTier gives Foundation the free plan,
      // ten documents a month, and Growth the R49 plan. A member paying
      // R100, reading the same words as the R180 card, would hit the cap
      // at ten documents and reasonably ask for a refund.
      "KatisoBiz quoting and invoicing, free plan included",
    ],
    ctaLabel: "Start Your Free Trial",
  },
  {
    id: "growth_engine",
    name: "Growth",
    priceLabel: "R180/month or R1,199/year",
    description: "Ready to reach more customers? Everything in Foundation, plus:",
    // Same handoff: "Marketplace Presence appears in both tier lists, which
    // makes the Growth list read as padded rather than better." The two
    // bullets Foundation already covers (marketplace, Nomads) are gone from
    // this card; "Everything in Foundation, plus" already says it. The
    // KatisoBiz bullet stays on both cards because the entitlement genuinely
    // differs between them.
    features: [
      // Not matched to a real feature: a member has one page, and there is
      // no campaign-page builder in the code. Kept as written and flagged.
      "Campaign Landing Pages",
      "See how many people visit your page, right in your dashboard",
      "Ready-made social media images, created from your page details",
      // The next two are not matched to anything in the code. Kept as
      // written and flagged in the report.
      "Monthly Optimisation",
      "Growth Reporting",
      "Take bookings and sell products straight from your page",
      // Reworded per the handoff: nothing in the system applies the R49
      // plan automatically or connects a Growth account to a KatisoBiz
      // account by itself, so the words promise the process that actually
      // happens: we switch it on. Flagged in the report as a product gap.
      "KatisoBiz R49 plan features, part of Growth, switched on for you by our team",
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
  if (tier === "enterprise") return "PAYSTACK_PLAN_ENTERPRISE";
  if (tier === "foundation") return interval === "annual" ? "PAYSTACK_PLAN_FOUNDATION_ANNUAL" : "PAYSTACK_PLAN_FOUNDATION";
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
