import type { Tier } from "@/lib/paystack/plans";

// BizUp/docs/bizup-phase1-spec.md Sec 2 and Sec 15.
//
// Entitlement level (`plan`) and where it came from (`plan_source`) are
// modelled separately and deliberately. A member on `paid` because Growth
// Engine bundles it and a member on `paid` because they pay R49 directly
// have identical capabilities but completely different billing
// consequences when a subscription lapses. Merging them causes billing
// bugs, so nothing in this file collapses the two.
//
// Updated 27 July 2026 for the redefined R89 tier. It used to mean only
// "no document cap", so a single allowance number described it fully.
// Sec 2 now defines it as unlimited volume **plus multi-user plus
// recurring invoices**, which a number cannot express. Capabilities are
// therefore a record, not an integer, so Sprint 2 can switch multi-user
// and recurring invoices on by changing this file alone. Sec 13 is
// explicit that both must arrive "without a migration", and that is only
// true if nothing about them is encoded in the database today.

export type BizUpPlan = "free" | "paid" | "unlimited";
export type BizUpPlanSource =
  | "self_paid"
  | "bundled_foundation"
  | "bundled_growth_engine"
  | "bundled_enterprise";

export interface BizUpCapabilities {
  /** Documents per calendar month. null means uncapped. */
  documentsPerMonth: number | null;
  /** Sec 13, Sprint 2. Phase 1 ships 1 for every tier, since multi-user is not built. */
  maxUsers: number;
  /** Sec 13, Sprint 2. */
  recurringInvoices: boolean;
  /** Sec 2. Free gets one template, paid gets all five. */
  allTemplates: boolean;
  /** Sec 2. Free cannot upload a logo. */
  ownLogo: boolean;
  /** Sec 2. */
  customerDatabase: boolean;
  /** Sec 12, reports 1 to 6. */
  reports: boolean;
  /**
   * Sec 12, report 7. Explicitly placed in the R49 tier, not held back for
   * R89: "A statement is a chasing-money tool, and chasing money is a core
   * pain for exactly the solo operator R49 is aimed at."
   */
  clientStatements: boolean;
  /**
   * Sec 12, the accountant export package.
   *
   * Sec 12 does not name a tier for this one. Grouped with reports (paid
   * and above) because it lives in the reports section and is built from
   * the same data. Worth a second look before launch though: Sec 12 calls
   * it "a referral channel, not a convenience feature", and a referral
   * channel arguably works harder on the free tier, where it puts KatisoBiz in
   * front of accountants who have never heard of it.
   */
  accountantExport: boolean;
}

/**
 * Sec 2's ladder.
 *
 * The volume numbers look arbitrary without the reasoning, so: a typical
 * member does about one job per working day, roughly 22 jobs a month. 10
 * free covers a genuine side-hustler while still putting footer-branded
 * documents in front of other business owners. 75 sits well above a
 * typical member at roughly 44 documents a month, so the cap binds only
 * once the business is doing well enough to afford the upgrade.
 *
 * Sec 2 on what each tier is for, which governs any future "which tier
 * does X go in" argument: free proves the product works, R49 makes a solo
 * operator better, R89 handles a small team. A feature belongs at R89 only
 * if it is genuinely about scale, meaning more people or more automation.
 */
export const CAPABILITIES: Record<BizUpPlan, BizUpCapabilities> = {
  free: {
    documentsPerMonth: 10,
    maxUsers: 1,
    recurringInvoices: false,
    allTemplates: false,
    ownLogo: false,
    customerDatabase: false,
    reports: false,
    clientStatements: false,
    accountantExport: false,
  },
  paid: {
    documentsPerMonth: 75,
    maxUsers: 1,
    recurringInvoices: false,
    allTemplates: true,
    ownLogo: true,
    customerDatabase: true,
    reports: true,
    clientStatements: true,
    accountantExport: true,
  },
  unlimited: {
    documentsPerMonth: null,
    // Sec 13: "Multi-user accounts, up to 5 users." Sprint 2, not Phase 1.
    // Stated here as the target so the structure is already shaped for it,
    // but see PHASE_1_MAX_USERS below, which is what the app actually
    // enforces today.
    maxUsers: 5,
    recurringInvoices: true,
    allTemplates: true,
    ownLogo: true,
    customerDatabase: true,
    reports: true,
    clientStatements: true,
    accountantExport: true,
  },
};

/**
 * What Phase 1 actually enforces, regardless of the tier's eventual
 * entitlement. Multi-user is not built, so no account gets more than one
 * user today even on the unlimited tier.
 *
 * Kept as a separate constant rather than by editing `unlimited.maxUsers`
 * to 1, so that switching multi-user on in Sprint 2 means deleting this
 * clamp rather than remembering what the real number was supposed to be.
 */
export const PHASE_1_MAX_USERS = 1;

export function capabilitiesFor(plan: BizUpPlan): BizUpCapabilities {
  const target = CAPABILITIES[plan];
  return { ...target, maxUsers: Math.min(target.maxUsers, PHASE_1_MAX_USERS) };
}

/** Kept for the many call sites that only care about the cap. */
export function documentAllowance(plan: BizUpPlan): number | null {
  return CAPABILITIES[plan].documentsPerMonth;
}

/**
 * Sec 2's bundling table. Foundation gets KatisoBiz Free and can buy the R49
 * tier à la carte without upgrading to Growth Engine, which is why this
 * returns an entitlement rather than gating on tier at the call site.
 */
export function bizUpEntitlementForTier(tier: Tier): {
  plan: BizUpPlan;
  planSource: BizUpPlanSource;
} {
  switch (tier) {
    case "foundation":
      return { plan: "free", planSource: "bundled_foundation" };
    case "growth_engine":
      return { plan: "paid", planSource: "bundled_growth_engine" };
    case "enterprise":
      return { plan: "paid", planSource: "bundled_enterprise" };
  }
}

/**
 * Sec 15: "When a Growth subscription lapses, the KatisoBiz entitlement drops
 * to `free`. It does not delete anything." Exposed as its own function so
 * the lapse path cannot accidentally be written as a delete.
 */
export function lapsedEntitlement(): { plan: BizUpPlan; planSource: BizUpPlanSource } {
  return { plan: "free", planSource: "self_paid" };
}
