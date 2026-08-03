/**
 * The referral explainer, written once and reused everywhere (handoff
 * section 8): this exact component renders on the public site now, and the
 * same words go into the member dashboard and the referral email in Sprint
 * 2. It answers four questions in order: what a member earns, when they
 * earn it, when they stop earning it, and what happens to the money. A
 * member must never learn a rule of this programme for the first time from
 * a payout that surprises them.
 *
 * Rates come from the database (svc.referral_rate) via props; the fallback
 * values are the approved structure and only render before the schema is
 * live.
 *
 * Note for Sprint 3: the payout mechanic is Dewald's open decision. The
 * wording below describes the credit path the handoff says to build first;
 * if he chooses differently, this one file is where the words change.
 */
export type ReferralRates = { level1: number; level2: number; level3: number };

const DEFAULT_RATES: ReferralRates = { level1: 500, level2: 250, level3: 150 };

function rand(cents: number): string {
  return `R${(cents / 100).toFixed(2)}`;
}

export function ReferralExplainer({ rates = DEFAULT_RATES }: { rates?: ReferralRates }) {
  const example = rand(3 * rates.level1 + 2 * rates.level2);

  return (
    <div className="space-y-6 text-base leading-relaxed">
      <div>
        <h3 className="font-svc-heading text-lg font-bold">What you earn</h3>
        <p className="mt-2">
          When someone joins SVC using your link and their membership is active,
          you earn a small monthly thank-you: {rand(rates.level1)} a month for
          each person you signed up yourself, {rand(rates.level2)} a month when
          someone they signed up is active, and {rand(rates.level3)} a month one
          step further. It stops there. There is no fourth level, ever.
        </p>
      </div>
      <div>
        <h3 className="font-svc-heading text-lg font-bold">When you earn it</h3>
        <p className="mt-2">
          You earn for a month only when that person&apos;s membership is paid
          and active for that month. If they skip a month, you simply do not
          earn for them that month.
        </p>
      </div>
      <div>
        <h3 className="font-svc-heading text-lg font-bold">When it stops</h3>
        <p className="mt-2">
          When someone cancels, the earning for them stops at the end of their
          paid period. If they come back later, it starts again. Nothing else
          ends it.
        </p>
      </div>
      <div>
        <h3 className="font-svc-heading text-lg font-bold">What happens to the money</h3>
        <p className="mt-2">
          Your earnings build up as credit on your SVC account, and that credit
          goes toward your own next membership payment. You can see everything
          on your dashboard: who joined at each level, this month&apos;s
          earning, your total earned, and what has been applied.
        </p>
      </div>
      <div className="border-2 border-svc-ink/15 bg-white/60 p-5">
        <h3 className="font-svc-heading text-base font-bold">A worked example</h3>
        <p className="mt-2 text-sm leading-relaxed">
          Say you sign up three friends, and two of your friends each sign up
          one person of their own. In a month where all five memberships are
          active, you earn 3 x {rand(rates.level1)} plus 2 x {rand(rates.level2)},
          which is {example} of credit toward your own membership. If one friend
          skips a month, that friend&apos;s {rand(rates.level1)} simply does not
          accrue for that month.
        </p>
      </div>
      <p className="text-sm text-svc-ink/70">
        Referrals are optional. Your coupons, magazine, education benefits and
        draw entries are yours from day one whether you refer nobody or a
        hundred people.
      </p>
    </div>
  );
}
