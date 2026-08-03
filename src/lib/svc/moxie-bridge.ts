import "server-only";

import { createSvcClient } from "@/lib/svc/db";

/**
 * The one sanctioned meeting point between SVC and Moxie, as an interface
 * rather than a join (handoff 3.2): Moxie's entitlement check asks this
 * function whether an auth user is an SVC member whose package includes
 * the magazine, and gets back the date their access started. No Moxie code
 * touches an svc table directly, and no svc table references a Moxie one.
 *
 * Fails to null on any error, including the svc schema not existing yet,
 * so Moxie's own behaviour can never be broken by SVC's rollout state.
 */
export async function svcMagazineAccessStart(authUserId: string): Promise<string | null> {
  try {
    const db = createSvcClient();

    const { data: member } = await db
      .from("member")
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (!member) return null;

    // Active, or cancelled with paid time left: benefits run to the end of
    // the paid period.
    const { data: subs } = await db
      .from("subscription")
      .select("started_at, current_period_end, status, package_id")
      .eq("member_id", member.id)
      .in("status", ["active", "cancelled"])
      .gte("current_period_end", new Date().toISOString());
    if (!subs || subs.length === 0) return null;

    const { data: magazineBenefits } = await db
      .from("package_benefit")
      .select("package_id, benefit:benefit_id (benefit_type)")
      .in("package_id", subs.map((s) => s.package_id));

    const magazinePackages = new Set(
      (magazineBenefits ?? [])
        .filter((pb) => (pb.benefit as unknown as { benefit_type: string } | null)?.benefit_type === "magazine_access")
        .map((pb) => pb.package_id)
    );

    const qualifying = subs
      .filter((s) => magazinePackages.has(s.package_id) && s.started_at)
      .sort((a, b) => new Date(a.started_at!).getTime() - new Date(b.started_at!).getTime());

    return qualifying[0]?.started_at ?? null;
  } catch (err) {
    console.error("SVC magazine access check failed", err);
    return null;
  }
}
