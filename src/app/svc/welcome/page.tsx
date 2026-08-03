import type { Metadata } from "next";
import Link from "next/link";
import { svcPath } from "@/lib/svc/host";
import { getCurrentMember } from "@/lib/svc/member";
import { verifySvcTransaction } from "@/lib/svc/payments";
import { activateSvcMembership } from "@/lib/svc/activation";
import { svcBtnGreen } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "Welcome",
  robots: { index: false, follow: false },
};

// Paystack's callback lands here with ?reference=. The page verifies the
// reference server-side against Paystack and activates on success, which
// makes the whole flow work with no webhook: the live necessity while SVC
// borrows the shared DF test account whose webhook must not be touched.
// The reference is never trusted, only verified; a made-up reference
// verifies as nothing and activates nothing. When SVC's own account and
// webhook exist, both paths run and the dedup makes them idempotent.
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const params = await searchParams;
  const member = await getCurrentMember();
  const accountHref = await svcPath("/account");
  const homeHref = await svcPath("/");

  let activated = false;
  const reference = params.reference ?? params.trxref;
  if (reference && member) {
    const verified = await verifySvcTransaction(reference);
    if (
      verified &&
      verified.metadata.kind === "svc_membership" &&
      verified.metadata.svc_member_id === member.id &&
      verified.metadata.svc_subscription_id
    ) {
      const result = await activateSvcMembership({
        reference: verified.reference,
        eventType: "callback.verified",
        memberId: member.id,
        subscriptionId: verified.metadata.svc_subscription_id,
        amountCents: verified.amountCents,
        interval: verified.metadata.svc_interval,
        customerCode: verified.customerCode,
        planCode: verified.planCode,
        payload: { source: "callback_verify", reference: verified.reference },
      });
      activated = result.activated || result.duplicate;
    }
  }

  return (
    <div className="bg-svc-green px-4 py-16 text-white">
      <div className="mx-auto w-full max-w-md text-center">
        <h1 className="font-svc-heading text-3xl font-bold">
          {member ? `Welcome, ${member.first_name}` : "Welcome"}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-white/85">
          {activated
            ? "Your membership is active and your confirmation email is on its way. Your benefits arrive with the next monthly issue, and your dashboard is ready now."
            : "Thank you for joining Smart Value Club. Your payment is being confirmed; your dashboard will show Active the moment it lands."}
        </p>
        <div className="mt-8 flex justify-center">
          <Link href={member ? accountHref : homeHref} className={svcBtnGreen}>
            {member ? "Open my dashboard" : "Back to the site"}
          </Link>
        </div>
      </div>
    </div>
  );
}
