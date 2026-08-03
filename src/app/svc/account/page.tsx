import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { svcPath } from "@/lib/svc/host";
import { getCurrentMember } from "@/lib/svc/member";
import { createSvcClient } from "@/lib/svc/db";
import { formatRand } from "@/lib/svc/data";
import { signOutSvc } from "../login/actions";
import { svcBtnOutline } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

// Sprint 1's minimal account view: who you are and where your membership
// stands. The real member dashboard (benefits, savings counter, referral
// numbers, demand capture) is Sprint 2, on top of the ledger.
export default async function AccountPage() {
  const member = await getCurrentMember();
  if (!member) redirect(`${await svcPath("/login")}`);

  const db = createSvcClient();
  const { data: subscription } = await db
    .from("subscription")
    .select("status, current_period_end, package:package_id (name, monthly_price_cents)")
    .eq("member_id", member!.id)
    .in("status", ["pending_payment", "active", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const pkg = subscription?.package as unknown as {
    name: string;
    monthly_price_cents: number;
  } | null;

  const checkoutHref = await svcPath("/join/checkout");

  return (
    <div className="bg-svc-cream px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="font-svc-heading text-3xl font-bold">
          Good day {member!.first_name}
        </h1>

        <div className="mt-8 space-y-6">
          <section className="border-2 border-svc-ink/15 bg-white/60 p-6">
            <h2 className="font-svc-heading text-lg font-bold">Your membership</h2>
            {subscription && pkg ? (
              <div className="mt-3 space-y-1 text-base">
                <p>
                  {pkg.name}, {formatRand(pkg.monthly_price_cents)} a month.
                </p>
                <p>
                  Status:{" "}
                  <span className="font-semibold">
                    {subscription.status === "active" && "Active"}
                    {subscription.status === "pending_payment" && "Waiting for payment"}
                    {subscription.status === "past_due" && "Payment overdue"}
                  </span>
                </p>
                {subscription.current_period_end && (
                  <p className="text-sm text-svc-ink/70">
                    Paid up to{" "}
                    {new Date(subscription.current_period_end).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    .
                  </p>
                )}
                {subscription.status === "pending_payment" && (
                  <p className="pt-2">
                    <Link href={checkoutHref} className="font-semibold text-svc-blue underline">
                      Complete your payment
                    </Link>
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-base leading-relaxed">
                No membership yet.{" "}
                <Link href={checkoutHref} className="font-semibold text-svc-blue underline">
                  Complete your joining
                </Link>{" "}
                and your benefits start with the next monthly issue.
              </p>
            )}
          </section>

          <section className="border-2 border-svc-ink/15 bg-white/60 p-6">
            <h2 className="font-svc-heading text-lg font-bold">Your details</h2>
            <dl className="mt-3 space-y-1 text-base">
              <div className="flex gap-2">
                <dt className="font-semibold">Cell number:</dt>
                <dd>
                  {member!.cell_number}
                  {member!.cell_verified_at ? " (verified)" : " (not yet verified)"}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-semibold">Email:</dt>
                <dd>{member!.email}</dd>
              </div>
            </dl>
          </section>

          <section className="border-2 border-svc-ink/15 bg-white/60 p-6">
            <h2 className="font-svc-heading text-lg font-bold">Coming with the next sprint</h2>
            <p className="mt-3 text-base leading-relaxed text-svc-ink/75">
              Your coupons, your savings counter, your draw entries and your
              referral link will all live here. The club is in its private
              build phase; you are early, and that is a good thing.
            </p>
          </section>

          <form action={signOutSvc}>
            <button type="submit" className={svcBtnOutline}>
              Log out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
