import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { svcPath } from "@/lib/svc/host";
import { getCurrentMember } from "@/lib/svc/member";
import { createSvcClient } from "@/lib/svc/db";
import { listMemberIssues, periodFor } from "@/lib/svc/ledger";
import { couponPortalUrl } from "@/lib/svc/coupons";
import { mifuelConfigured } from "@/lib/svc/mifuel";
import { saveCouponIdentity } from "../actions";
import { BenefitCard } from "@/components/svc/BenefitCard";
import { svcBtnGreen, svcInput, svcLabel } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "My coupons",
  robots: { index: false, follow: false },
};

// The member-facing coupon catalogue and selection screens (handoff
// section 9), built against the coupon interface and styled entirely as
// SVC. Today the manual import provider answers; when MiFuel's catalogue
// API lands, these screens stay as they are.
export default async function CouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ unlock?: string }>;
}) {
  const params = await searchParams;
  const member = await getCurrentMember();
  if (!member) redirect(`${await svcPath("/login")}`);

  const issues = await listMemberIssues(member!.id);
  const coupons = issues.filter((i) => i.benefit?.benefit_type === "coupon_pack");
  const accountHref = await svcPath("/account");
  const portalUrl = await couponPortalUrl();

  // The provider link state, shown only when MiFuel credentials exist in
  // this environment. Gated on a PAID membership per the provider's own
  // instruction (Adriaan, 4 August): the product is ordered on MiFuel
  // only after the client has actually paid on our side.
  let providerLinked = false;
  let needsUnlock = false;
  if (mifuelConfigured()) {
    const db = createSvcClient();
    const [{ data: identity }, { data: paidSub }] = await Promise.all([
      db.from("member").select("mifuel_provisioned_at").eq("id", member!.id).maybeSingle(),
      db
        .from("subscription")
        .select("id")
        .eq("member_id", member!.id)
        .in("status", ["active", "cancelled"])
        .gte("current_period_end", new Date().toISOString())
        .limit(1)
        .maybeSingle(),
    ]);
    providerLinked = !!identity?.mifuel_provisioned_at;
    needsUnlock = !providerLinked && !!paidSub;
  }

  const monthName = new Date(`${periodFor()}T00:00:00Z`).toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-svc-cream px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-2xl">
        <Link href={accountHref} className="text-sm font-semibold text-svc-blue underline">
          Back to my dashboard
        </Link>
        <h1 className="mt-2 font-svc-heading text-3xl font-bold">My coupons for {monthName}</h1>
        <p className="mt-2 text-base leading-relaxed text-svc-ink/75">
          Open a pack, add it to your trip, and after you have shopped, tell
          us you used it so your savings counter stays honest. Coupons refresh
          with the next monthly issue.
        </p>

        {providerLinked && (
          <p className="mt-4 border-2 border-svc-green bg-white/60 p-3 text-sm font-semibold text-svc-green">
            Your membership is linked to the coupon platform.
          </p>
        )}

        {params.unlock?.startsWith("error_") && (
          <p className="mt-4 border-2 border-svc-blue bg-white/60 p-3 text-sm">
            Your details are saved, but the coupon platform could not be
            reached just now. We will link you automatically; nothing more is
            needed from you.
          </p>
        )}

        {needsUnlock && (
          <section className="mt-6 border-2 border-svc-green bg-white/60 p-6">
            <h2 className="font-svc-heading text-lg font-bold">Unlock your coupons</h2>
            <p className="mt-2 text-sm leading-relaxed text-svc-ink/75">
              The coupon platform verifies members by identity, so it needs
              three details we did not ask for at signup. Once, and your
              coupons follow your cell number at the till.
            </p>
            {params.unlock && !params.unlock.startsWith("error_") && params.unlock !== "linked" && (
              <p className="mt-3 border-2 border-svc-blue bg-svc-cream p-3 text-sm">
                {params.unlock === "title" && "Pick your title."}
                {params.unlock === "dob" && "That date of birth does not look right."}
                {params.unlock === "id" && "Check the ID or passport number; an SA ID is 13 digits."}
                {params.unlock === "failed" && "Saving failed on our side; try again."}
              </p>
            )}
            <form action={saveCouponIdentity} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="u-title" className={svcLabel}>Title</label>
                  <select id="u-title" name="title" required className={`mt-2 ${svcInput}`}>
                    <option value="">Choose</option>
                    <option value="Mr">Mr</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Miss">Miss</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="u-dob" className={svcLabel}>Date of birth</label>
                  <input id="u-dob" name="dob" type="date" required className={`mt-2 ${svcInput}`} />
                </div>
                <div>
                  <label htmlFor="u-idtype" className={svcLabel}>Identification</label>
                  <select id="u-idtype" name="idType" className={`mt-2 ${svcInput}`}>
                    <option value="sa_id">SA ID number</option>
                    <option value="passport">Passport</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="u-idnumber" className={svcLabel}>ID or passport number</label>
                  <input id="u-idnumber" name="idNumber" type="text" inputMode="numeric" required className={`mt-2 ${svcInput}`} />
                </div>
              </div>
              <button type="submit" className={svcBtnGreen}>
                Link my coupons
              </button>
              <p className="text-xs text-svc-ink/60">
                Used only to register you with the coupon platform, never
                shown anywhere afterwards.
              </p>
            </form>
          </section>
        )}

        {coupons.length === 0 ? (
          <p className="mt-6 border-2 border-svc-ink/15 bg-white/60 p-5 text-base leading-relaxed text-svc-ink/75">
            No coupons in your account yet. They are issued to paid-up members
            with the monthly issue, and we email you the moment they land.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {coupons.map((issue) => (
              <BenefitCard key={issue.id} issue={issue} back="/account/coupons" couponPortalUrl={portalUrl} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
