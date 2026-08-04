import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { svcPath, isSvcHost, SVC_ORIGIN } from "@/lib/svc/host";
import { MOXIE_ORIGIN } from "@/lib/moxie/host";
import { getCurrentMember } from "@/lib/svc/member";
import { createSvcClient } from "@/lib/svc/db";
import { formatRand } from "@/lib/svc/data";
import { listMemberIssues, savingsTotalCents, periodFor } from "@/lib/svc/ledger";
import { getOrCreateReferralCode, memberReferralStats } from "@/lib/svc/referrals";
import { memberDrawSummary } from "@/lib/svc/draw";
import { drawPurchaseEligibility } from "@/lib/svc/draw-purchase";
import { signOutSvc } from "../login/actions";
import { submitDemandSignal, buyDrawTickets } from "./actions";
import { BenefitCard } from "@/components/svc/BenefitCard";
import { svcBtnOutline, svcInput, svcLabel } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "My dashboard",
  robots: { index: false, follow: false },
};

// The draw panel: entries so far by source, the live "R.. more and you
// earn another entry" counter, the visible self-report cap, and, only
// when the flag is on AND every server-side gate passes, the purchase
// form (handoff 10.1: no purchase control renders anywhere outside this
// logged-in dashboard).
async function SvcDrawPanel({
  summary,
  eligibility,
  ticketsParam,
}: {
  summary: Awaited<ReturnType<typeof memberDrawSummary>>;
  eligibility: Awaited<ReturnType<typeof drawPurchaseEligibility>>;
  ticketsParam?: string;
}) {
  if (!summary) return null;
  const { draw, free, earned, purchased, total, frozen } = summary;

  return (
    <section id="draw" className="mt-8 border-2 border-svc-ink/15 bg-white/60 p-6">
      <h2 className="font-svc-heading text-lg font-bold">This month&apos;s draw</h2>
      <p className="mt-1 text-sm text-svc-ink/75">
        {draw.prize_description}
        {draw.prize_value_cents ? ` (${formatRand(draw.prize_value_cents)})` : ""}. Entries freeze{" "}
        {new Date(draw.cutoff_at).toLocaleString("en-ZA", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}.
      </p>

      {ticketsParam === "done" && (
        <p className="mt-3 border-2 border-svc-green bg-svc-cream p-3 text-sm">Your extra entries are in.</p>
      )}
      {ticketsParam && ticketsParam !== "done" && (
        <p className="mt-3 border-2 border-svc-blue bg-svc-cream p-3 text-sm">
          {ticketsParam === "frozen" && "The draw has already frozen for this month."}
          {ticketsParam === "package_below_floor" && "Extra entries need a qualifying membership tier."}
          {ticketsParam === "no_cleared_payment" && "Extra entries open up once your first payment has cleared."}
          {["failed", "count", "flag_off", "no_subscription", "no_draw"].includes(ticketsParam) &&
            "That purchase could not be completed."}
        </p>
      )}

      <dl className="mt-4 grid grid-cols-3 gap-px bg-svc-ink/10 text-center">
        {[
          ["Free", free],
          ["Earned", frozen ? summary.earned.earnedTotal : earned.earnedTotal],
          ["Purchased", purchased],
        ].map(([label, value]) => (
          <div key={label} className="bg-white/80 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-svc-ink/60">{label}</dt>
            <dd className="mt-1 font-svc-heading text-xl font-bold">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-center text-sm font-semibold">
        {total} {total === 1 ? "entry" : "entries"} in this month&apos;s draw{frozen ? " (frozen)" : ""}.
      </p>

      {!frozen && (
        <div className="mt-3 space-y-1 text-sm text-svc-ink/75">
          <p>
            {formatRand(earned.centsToNextEntry)} more redeemed and you earn
            another entry.
          </p>
          <p className="text-xs text-svc-ink/60">
            Self-confirmed savings count for up to {earned.selfCap} entries a
            month; you have used {Math.min(earned.selfEntriesUncapped, earned.selfCap)} of them
            {earned.selfEntriesUncapped > earned.selfCap ? " (the cap is doing its work)" : ""}.
          </p>
        </div>
      )}

      {eligibility.eligible && draw.ticket_price_cents && (
        <form action={buyDrawTickets} className="mt-4 border-t-2 border-svc-ink/10 pt-4">
          <label htmlFor="ticket-count" className={svcLabel}>
            Extra entries at {formatRand(draw.ticket_price_cents)} each
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="ticket-count"
              name="count"
              type="number"
              min={1}
              max={100}
              defaultValue={5}
              className={`${svcInput} w-28`}
            />
            <button
              type="submit"
              className="inline-flex min-h-12 flex-1 items-center justify-center bg-svc-green px-4 text-sm font-semibold text-white hover:bg-svc-ink"
            >
              Buy extra entries
            </button>
          </div>
          <p className="mt-2 text-xs text-svc-ink/60">
            A members-only benefit of your club membership, which itself is
            what carries the value.
          </p>
        </form>
      )}
    </section>
  );
}

// The member dashboard (handoff 7.1 and section 5): the savings number
// computed only from redeemed value, this month's benefits with their
// state controls, the three-number referral view, and cancellation. One
// primary action per screen; everything else visibly secondary.
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string; ask?: string; tickets?: string }>;
}) {
  const params = await searchParams;

  // Two different "no member" cases, and only one of them belongs at the
  // login screen. No session at all: go log in. A signed-in account with
  // no SVC membership (an admin-only login, a Moxie reader): show them
  // where they are instead of bouncing them back to login, which loops
  // and reads as a broken flash.
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`${await svcPath("/login")}`);

  const member = await getCurrentMember();
  if (!member) {
    const { getSvcAdmin } = await import("@/lib/svc/admin");
    const isAdmin = !!(await getSvcAdmin());
    const joinHref = await svcPath("/join");
    const adminHref = await svcPath("/admin");
    return (
      <div className="bg-svc-cream px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-md">
          <h1 className="font-svc-heading text-3xl font-bold">You are signed in</h1>
          <p className="mt-3 text-base leading-relaxed text-svc-ink/75">
            This login ({user.email}) has no Smart Value Club membership
            attached to it{isAdmin ? ", but it does have admin access" : ""}.
          </p>
          <div className="mt-6 space-y-3">
            {isAdmin && (
              <Link
                href={adminHref}
                className="inline-flex min-h-12 w-full items-center justify-center bg-svc-green px-6 text-base font-semibold text-white hover:bg-svc-ink"
              >
                Go to admin
              </Link>
            )}
            <Link
              href={joinHref}
              className="inline-flex min-h-12 w-full items-center justify-center border-2 border-svc-green px-6 text-base font-semibold text-svc-green hover:bg-svc-green hover:text-white"
            >
              Join as a member
            </Link>
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

  const db = createSvcClient();
  const [{ data: subscription }, issues, savings, referralStats, referralCode, drawSummary, drawEligibility] = await Promise.all([
    db
      .from("subscription")
      .select("status, current_period_end, cancelled_at, package:package_id (name, monthly_price_cents)")
      .eq("member_id", member!.id)
      .in("status", ["pending_payment", "active", "past_due", "cancelled"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    listMemberIssues(member!.id),
    savingsTotalCents(member!.id),
    memberReferralStats(member!.id),
    getOrCreateReferralCode(member!.id),
    memberDrawSummary(member!.id),
    drawPurchaseEligibility(member!.id),
  ]);

  const pkg = subscription?.package as unknown as { name: string; monthly_price_cents: number } | null;
  const paidUp =
    subscription &&
    (subscription.status === "active" ||
      (subscription.status === "cancelled" &&
        subscription.current_period_end &&
        new Date(subscription.current_period_end).getTime() > Date.now()));

  const availableFace = issues
    .filter((i) => i.status !== "redeemed" && i.status !== "expired")
    .reduce((sum, i) => sum + i.face_value_cents, 0);

  const host = (await headers()).get("host") ?? "";
  const onSvcHost = isSvcHost(host);
  const moxieHref = onSvcHost ? MOXIE_ORIGIN : "/moxie";
  const couponsHref = await svcPath("/account/coupons");
  const cancelHref = await svcPath("/account/cancel");
  const checkoutHref = await svcPath("/join/checkout");

  const referralLink = referralCode
    ? `${onSvcHost ? SVC_ORIGIN : ""}${await svcPath("/join")}?ref=${referralCode}`
    : null;
  const whatsappShare = referralLink
    ? `https://wa.me/?text=${encodeURIComponent(
        `I am saving with Smart Value Club: real grocery coupons for the stores we already shop at. Join with my link: ${
          referralLink.startsWith("http") ? referralLink : `${SVC_ORIGIN}/join?ref=${referralCode}`
        }`
      )}`
    : null;

  const monthName = new Date(`${periodFor()}T00:00:00Z`).toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-svc-cream px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="font-svc-heading text-3xl font-bold">Good day {member!.first_name}</h1>

        {params.cancelled && (
          <p className="mt-4 border-2 border-svc-blue bg-white/60 p-4 text-sm leading-relaxed">
            Your membership is cancelled and will not bill again. Your benefits
            stay live until the end of the period you have paid for. You are
            welcome back anytime.
          </p>
        )}

        {/* The savings number, handoff 7.1: redeemed value only. A member
            who has redeemed nothing sees what is available instead, never
            a projection. */}
        <section className="mt-6 border-4 border-svc-green bg-white/60 p-6 text-center">
          {savings.total > 0 ? (
            <>
              <p className="text-sm font-semibold uppercase tracking-wide text-svc-ink/60">
                You have saved
              </p>
              <p className="mt-1 font-svc-heading text-4xl font-bold text-svc-green">
                {formatRand(savings.total)}
              </p>
              <p className="mt-1 text-sm text-svc-ink/70">
                with SVC since{" "}
                {new Date(savings.since!).toLocaleDateString("en-ZA", { month: "long", year: "numeric" })},
                counted only from benefits you actually used.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold uppercase tracking-wide text-svc-ink/60">
                Waiting to be used this month
              </p>
              <p className="mt-1 font-svc-heading text-4xl font-bold text-svc-green">
                {availableFace > 0 ? formatRand(availableFace) : "R0"}
              </p>
              <p className="mt-1 text-sm text-svc-ink/70">
                {availableFace > 0
                  ? "in face value sitting in your account. Use a benefit and your real savings start counting here."
                  : "Your savings counter starts the first time you use a benefit. We never show you a made-up number."}
              </p>
            </>
          )}
        </section>

        {/* Quick navigation: the two things a member opens the app for,
            reachable without scrolling (handoff section 5: the primary
            action lives in the first screen). */}
        <nav className="mt-4 grid grid-cols-2 gap-3">
          <Link
            href={couponsHref}
            className="flex min-h-20 flex-col items-center justify-center bg-svc-green p-3 text-center text-white hover:bg-svc-ink"
          >
            <span className="font-svc-heading text-lg font-bold">My coupons</span>
            <span className="text-xs text-white/80">
              {issues.filter((i) => i.benefit?.benefit_type === "coupon_pack" && i.status !== "redeemed" && i.status !== "expired").length}{" "}
              waiting this month
            </span>
          </Link>
          <Link
            href="#draw"
            className="flex min-h-20 flex-col items-center justify-center bg-svc-blue p-3 text-center text-white hover:bg-svc-ink"
          >
            <span className="font-svc-heading text-lg font-bold">The draw</span>
            <span className="text-xs text-white/80">
              {drawSummary ? `${drawSummary.total} ${drawSummary.total === 1 ? "entry" : "entries"} in` : "opens with the month's draw"}
            </span>
          </Link>
        </nav>

        {/* The one membership state that must interrupt: an unpaid one. */}
        {(!subscription || subscription.status === "pending_payment") && (
          <p className="mt-4 border-2 border-svc-amber bg-white/70 p-4 text-sm leading-relaxed">
            Your membership is not paid yet, so benefits cannot be issued to
            you.{" "}
            <Link href={checkoutHref} className="font-semibold text-svc-blue underline">
              Complete your payment
            </Link>{" "}
            and everything below comes alive.
          </p>
        )}

        {/* This month's benefits. */}
        <section className="mt-6">
          <div className="flex items-end justify-between">
            <h2 className="font-svc-heading text-xl font-bold">Your benefits for {monthName}</h2>
            <Link href={couponsHref} className="text-sm font-semibold text-svc-blue underline">
              My coupons
            </Link>
          </div>
          {issues.length === 0 ? (
            <p className="mt-3 border-2 border-svc-ink/15 bg-white/60 p-5 text-base leading-relaxed text-svc-ink/75">
              {paidUp
                ? "Your benefits for this month are on their way and land with the next daily issue. We will email you the moment they are ready."
                : "Benefits are issued to paid-up members on the 1st of every month. Complete your membership and yours arrive with the next issue."}
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              {issues.map((issue) => (
                <BenefitCard key={issue.id} issue={issue} back="/account" moxiePathPrefix={moxieHref} />
              ))}
            </div>
          )}
        </section>

        {/* The referral view: three numbers, not a tree (handoff sec 8). */}
        <section className="mt-8 border-2 border-svc-ink/15 bg-white/60 p-6">
          <h2 className="font-svc-heading text-lg font-bold">Tell a friend, earn a thank-you</h2>
          {referralLink ? (
            <>
              <p className="mt-2 text-sm leading-relaxed text-svc-ink/75">
                Share your link. When someone joins with it and their
                membership is active, you earn a small monthly amount as
                credit toward your own membership.
              </p>
              <p className="mt-3 break-all border-2 border-svc-ink/15 bg-svc-cream px-3 py-2 font-mono text-sm">
                {referralLink.startsWith("http") ? referralLink : `${SVC_ORIGIN}/join?ref=${referralCode}`}
              </p>
              <div className="mt-3">
                {whatsappShare && (
                  <a
                    href={whatsappShare}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-12 w-full items-center justify-center bg-svc-green px-5 text-sm font-semibold text-white hover:bg-svc-ink sm:w-auto"
                  >
                    Share on WhatsApp
                  </a>
                )}
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-px bg-svc-ink/10 text-center">
                {referralStats.joinedByLevel.map((l) => (
                  <div key={l.level} className="bg-white/80 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-svc-ink/60">
                      Level {l.level}
                    </dt>
                    <dd className="mt-1 font-svc-heading text-xl font-bold">{l.count}</dd>
                  </div>
                ))}
              </dl>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt>This month&apos;s earning</dt>
                  <dd className="font-semibold">{formatRand(referralStats.thisMonthCents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Total earned</dt>
                  <dd className="font-semibold">{formatRand(referralStats.totalEarnedCents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Applied or paid out</dt>
                  <dd className="font-semibold">{formatRand(referralStats.paidOutCents)}</dd>
                </div>
                <div className="flex justify-between border-t-2 border-svc-ink/10 pt-1">
                  <dt>Current balance</dt>
                  <dd className="font-semibold text-svc-green">{formatRand(referralStats.balanceCents)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-svc-ink/60">
                Referrals are optional and your benefits never depend on them.
                Earnings are calculated once a month, so this month&apos;s
                number appears after the monthly run rather than the moment
                someone joins.{" "}
                <Link href={`${await svcPath("/how-it-works")}`} className="font-semibold text-svc-blue underline">
                  The full rules, with a worked example
                </Link>
                .
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-svc-ink/75">
              Your share link appears here once your account is fully set up.
            </p>
          )}
        </section>

        <SvcDrawPanel summary={drawSummary} eligibility={drawEligibility} ticketsParam={params.tickets} />

        {/* Demand capture: the one question that steers the next deal. */}
        <section className="mt-8 border-2 border-svc-ink/15 bg-white/60 p-6">
          <h2 className="font-svc-heading text-lg font-bold">
            Which shop or product should we get coupons for next?
          </h2>
          {params.ask === "thanks" ? (
            <p className="mt-2 text-sm leading-relaxed text-svc-green">
              Thank you. Every answer steers which deal we chase next.
            </p>
          ) : (
            <>
              {params.ask === "missing" && (
                <p className="mt-2 text-sm text-svc-ink/70">Pick a category and tell us the shop or product.</p>
              )}
              <form action={submitDemandSignal} className="mt-3 space-y-3">
                <div>
                  <label htmlFor="ask-category" className={svcLabel}>Category</label>
                  <select id="ask-category" name="category" required className={`mt-2 ${svcInput}`}>
                    <option value="">Choose one</option>
                    <option value="groceries">Groceries</option>
                    <option value="pharmacy">Pharmacy and health</option>
                    <option value="fuel">Fuel</option>
                    <option value="clothing">Clothing</option>
                    <option value="restaurants">Restaurants and takeaways</option>
                    <option value="airtime_data">Airtime and data</option>
                    <option value="other">Something else</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ask-message" className={svcLabel}>The shop or product</label>
                  <input id="ask-message" name="message" type="text" required className={`mt-2 ${svcInput}`} />
                </div>
                <button
                  type="submit"
                  className="inline-flex min-h-12 items-center justify-center border-2 border-svc-green px-5 text-sm font-semibold text-svc-green hover:bg-svc-green hover:text-white"
                >
                  Send it in
                </button>
              </form>
            </>
          )}
        </section>

        {/* Membership detail, housekeeping territory: glanced at monthly,
            not daily, so it lives below the daily-use sections. */}
        <section className="mt-8 border-2 border-svc-ink/15 bg-white/60 p-6">
          <h2 className="font-svc-heading text-lg font-bold">Your membership</h2>
          {subscription && pkg ? (
            <div className="mt-2 space-y-1 text-base">
              <p>
                {pkg.name}, {formatRand(pkg.monthly_price_cents)} a month.{" "}
                <span className="font-semibold">
                  {subscription.status === "active" && "Active."}
                  {subscription.status === "pending_payment" && "Waiting for payment."}
                  {subscription.status === "past_due" && "Payment overdue."}
                  {subscription.status === "cancelled" && (paidUp ? "Cancelled, paid up." : "Cancelled.")}
                </span>
              </p>
              {subscription.current_period_end && (
                <p className="text-sm text-svc-ink/70">
                  Paid to{" "}
                  {new Date(subscription.current_period_end).toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  .
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-base leading-relaxed">
              No membership yet.{" "}
              <Link href={checkoutHref} className="font-semibold text-svc-blue underline">
                Complete your joining
              </Link>
              .
            </p>
          )}
        </section>

        {/* Account housekeeping. */}
        <section className="mt-8 space-y-3">
          <form action={signOutSvc}>
            <button type="submit" className={svcBtnOutline}>
              Log out
            </button>
          </form>
          <p className="text-sm text-svc-ink/60">
            Stuck on anything? The{" "}
            <Link href={await svcPath("/help")} className="font-semibold text-svc-blue underline">
              Help Centre
            </Link>{" "}
            walks every step with pictures.
          </p>
          {subscription?.status === "active" && (
            <p className="text-sm text-svc-ink/60">
              Need to leave?{" "}
              <Link href={cancelHref} className="font-semibold text-svc-blue underline">
                Cancel your membership
              </Link>
              . No fees, benefits stay live to the end of your paid period.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
