import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { svcPath } from "@/lib/svc/host";
import { getCurrentMember } from "@/lib/svc/member";
import { cancelMembership } from "../actions";
import { svcBtnOutline, svcInput, svcLabel } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "Cancel my membership",
  robots: { index: false, follow: false },
};

export default async function CancelPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const member = await getCurrentMember();
  if (!member) redirect(`${await svcPath("/login")}`);

  const accountHref = await svcPath("/account");

  return (
    <div className="bg-svc-cream px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-md">
        <h1 className="font-svc-heading text-3xl font-bold">Cancel your membership</h1>
        <p className="mt-2 text-base leading-relaxed text-svc-ink/75">
          No fees and no argument. Your benefits stay live until the end of
          the period you have already paid for, and you will not be billed
          again. One question before you go, because the answer genuinely
          shapes what we fix next.
        </p>

        {params.error && (
          <p className="mt-6 border-2 border-svc-blue bg-white/60 p-4 text-sm leading-relaxed">
            {params.error === "reason"
              ? "Tell us the reason in a sentence; it is the one thing we ask."
              : "Something went wrong on our side. Please try again."}
          </p>
        )}

        <form action={cancelMembership} className="mt-8 space-y-5">
          <div>
            <label htmlFor="reason" className={svcLabel}>Why are you leaving?</label>
            <textarea id="reason" name="reason" required rows={4} className={`mt-2 ${svcInput}`} />
          </div>
          <button
            type="submit"
            className="inline-flex min-h-12 w-full items-center justify-center bg-svc-ink px-6 py-3 text-base font-semibold text-white hover:bg-svc-blue"
          >
            Cancel my membership
          </button>
        </form>

        <div className="mt-4">
          <Link href={accountHref} className={svcBtnOutline}>
            Keep my membership
          </Link>
        </div>
      </div>
    </div>
  );
}
