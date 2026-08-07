import { createAdminClient } from "@/lib/supabase/admin";

// Who may post what, and why (pricing settled with Dewald, 7 August 2026).
//
// Three tiers of employer, checked in this order:
//
//   1. A paying Growth or KatisoBiz member: unlimited posts, free. Derived
//      at read time from what the login actually owns, never stored on
//      jobs_employers -- a stored flag would keep granting free posts
//      after their real subscription lapsed. Free KatisoBiz accounts do
//      NOT count: a 2-minute free signup must not equal the R69 tier.
//   2. A paid jobs plan: starter (R45, 5 posts per calendar month) or
//      unlimited (R69). A lapsed subscription (plan_lapsed_at set) keeps
//      its existing posts for the 2-week grace but cannot post new ones.
//   3. Free: one post, once ever. Derived by counting vacancies ever
//      created rather than a stored counter (the bizup_accounts
//      documents-counter lesson: stored counters drift, counts are
//      self-healing).

export type JobsPlan = "free" | "starter" | "unlimited";

export const STARTER_POSTS_PER_MONTH = 5;
export const FREE_POSTS_EVER = 1;
export const LAPSE_GRACE_DAYS = 14;
/** Spec: "Listings run 30 days, one-tap renew, then automatic purge." */
export const VACANCY_DAYS = 30;

export interface EmployerEntitlement {
  /** Why they can post: a real membership, a paid plan, or the free taste. */
  source: "member" | "paid" | "free";
  plan: JobsPlan;
  /** null = unlimited. */
  postsAllowance: number | null;
  postsUsed: number;
  canPostNow: boolean;
  /** Set when a paid plan's subscription has died and the grace clock is running. */
  lapsed: boolean;
  /** One line for the dashboard, plain words. */
  label: string;
}

interface EmployerRow {
  id: string;
  owner_user_id: string;
  plan: JobsPlan;
  plan_lapsed_at: string | null;
  free_post_used_at: string | null;
}

/**
 * Is this login a paying Growth or KatisoBiz member? Same dual-path shape
 * as getMyBizUpAccount (lib/bizup/account.ts): a direct KatisoBiz account
 * on a paid plan wins; otherwise an active Growth membership counts.
 */
export async function isPayingMember(ownerUserId: string): Promise<boolean> {
  const admin = createAdminClient();

  const [{ data: bizup }, { data: memberships }] = await Promise.all([
    admin
      .from("bizup_accounts")
      .select("id")
      .eq("owner_user_id", ownerUserId)
      .in("plan", ["paid", "unlimited"])
      .limit(1),
    admin.from("growth_members").select("growth_client_id").eq("user_id", ownerUserId),
  ]);

  if ((bizup ?? []).length > 0) return true;

  const clientIds = (memberships ?? []).map((m) => m.growth_client_id);
  if (clientIds.length === 0) return false;

  // Every Growth tier is paid, so "active" is the whole test.
  const { data: activeClients } = await admin
    .from("growth_clients")
    .select("id")
    .in("id", clientIds)
    .eq("status", "active")
    .limit(1);

  return (activeClients ?? []).length > 0;
}

// Clock reads live here rather than inline in Server Components, because
// reading the clock inside a component body is impure and React's lint
// rules object to it even in a component that renders once per request
// (the recentBillingCutoff precedent in lib/bizup/billing.ts).

export function vacancyIsExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

export function vacancyNearingExpiry(expiresAt: string, windowDays: number): boolean {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return ms > 0 && ms < windowDays * 24 * 60 * 60 * 1000;
}

export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function startOfMonthIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function resolveEmployerEntitlement(employer: EmployerRow): Promise<EmployerEntitlement> {
  const admin = createAdminClient();

  if (await isPayingMember(employer.owner_user_id)) {
    return {
      source: "member",
      plan: employer.plan,
      postsAllowance: null,
      postsUsed: 0,
      canPostNow: true,
      lapsed: false,
      label: "Free unlimited posts, included with your membership",
    };
  }

  const lapsed = !!employer.plan_lapsed_at;

  if (employer.plan === "unlimited" && !lapsed) {
    return {
      source: "paid",
      plan: "unlimited",
      postsAllowance: null,
      postsUsed: 0,
      canPostNow: true,
      lapsed: false,
      label: "Unlimited posts, R69 a month",
    };
  }

  if (employer.plan === "starter" && !lapsed) {
    // Drafts are free to write; only a post that went live spends the
    // allowance (the preview-before-publish flow would otherwise charge
    // for the draft the moment it was saved).
    const { count } = await admin
      .from("jobs_vacancies")
      .select("id", { count: "exact", head: true })
      .eq("employer_id", employer.id)
      .neq("status", "draft")
      .gte("created_at", startOfMonthIso());
    const used = count ?? 0;
    return {
      source: "paid",
      plan: "starter",
      postsAllowance: STARTER_POSTS_PER_MONTH,
      postsUsed: used,
      canPostNow: used < STARTER_POSTS_PER_MONTH,
      lapsed: false,
      label: `${used} of ${STARTER_POSTS_PER_MONTH} posts used this month, R45 a month`,
    };
  }

  if ((employer.plan === "starter" || employer.plan === "unlimited") && lapsed) {
    // The grace period: existing posts keep running until the cron
    // enforces day 14; new posts need the subscription back. Named state
    // rather than an inline fallback, so the lapse path can never
    // accidentally be written as a delete (lib/bizup/entitlements.ts's
    // own rule).
    return lapsedEntitlement(employer.plan);
  }

  // Free: one post, ever.
  // "Once EVER" is a durable stamp, not a row count: the cleanup cron
  // purges vacancy rows about 30 days after expiry, so a count would
  // silently reset and hand out a fresh free post every cycle. The stamp
  // is set by publishVacancy the first time a free post goes live; the
  // count remains as a belt-and-braces check for rows not yet purged.
  const { count } = await admin
    .from("jobs_vacancies")
    .select("id", { count: "exact", head: true })
    .eq("employer_id", employer.id)
    .neq("status", "draft");
  const used = employer.free_post_used_at ? FREE_POSTS_EVER : (count ?? 0);
  return {
    source: "free",
    plan: "free",
    postsAllowance: FREE_POSTS_EVER,
    postsUsed: used,
    canPostNow: used < FREE_POSTS_EVER,
    lapsed: false,
    label: used === 0 ? "Your first post is free" : "Your free post is used",
  };
}

export function lapsedEntitlement(plan: JobsPlan): EmployerEntitlement {
  return {
    source: "paid",
    plan,
    postsAllowance: 0,
    postsUsed: 0,
    canPostNow: false,
    lapsed: true,
    label: "Your subscription has ended. Your posts stay live for two weeks.",
  };
}
