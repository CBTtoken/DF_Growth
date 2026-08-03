import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { svcPath } from "@/lib/svc/host";
import { getCurrentMember } from "@/lib/svc/member";
import { listMemberIssues, periodFor } from "@/lib/svc/ledger";
import { BenefitCard } from "@/components/svc/BenefitCard";

export const metadata: Metadata = {
  title: "My coupons",
  robots: { index: false, follow: false },
};

// The member-facing coupon catalogue and selection screens (handoff
// section 9), built against the coupon interface and styled entirely as
// SVC. Today the manual import provider answers; when MiFuel's catalogue
// API lands, these screens stay as they are.
export default async function CouponsPage() {
  const member = await getCurrentMember();
  if (!member) redirect(`${await svcPath("/login")}`);

  const issues = await listMemberIssues(member!.id);
  const coupons = issues.filter((i) => i.benefit?.benefit_type === "coupon_pack");
  const accountHref = await svcPath("/account");

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

        {coupons.length === 0 ? (
          <p className="mt-6 border-2 border-svc-ink/15 bg-white/60 p-5 text-base leading-relaxed text-svc-ink/75">
            No coupons in your account yet. They are issued to paid-up members
            with the monthly issue, and we email you the moment they land.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {coupons.map((issue) => (
              <BenefitCard key={issue.id} issue={issue} back="/account/coupons" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
