import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyJobsEmployer } from "@/lib/jobs/employer";
import { startJobsUpgrade } from "@/app/jobs/employer/upgrade/actions";
import { JobsFooter } from "@/components/jobs/JobsFooter";
import { jobsPath } from "@/lib/jobs/host";

export const metadata: Metadata = {
  title: { absolute: "Get more posts | KatisoBiz Jobs" },
  robots: { index: false, follow: false },
};

export default async function JobsUpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; already?: string }>;
}) {
  const employer = await getMyJobsEmployer();
  if (!employer) redirect(await jobsPath("/employers"));

  const { error, already } = await searchParams;
  const dashboardHref = await jobsPath("/employer");
  const isMember = employer.entitlement.source === "member";

  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto w-full max-w-md flex-1 px-6 py-10">
        <Link href={dashboardHref} className="text-sm font-medium text-neutral-500 hover:text-neutral-900">
          &larr; My jobs
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-neutral-900">Get more posts</h1>
        <p className="mt-1 text-sm text-neutral-500">{employer.entitlement.label}</p>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            We could not open the payment page. Please try again.
          </p>
        )}
        {already && (
          <p className="mt-4 rounded-xl bg-neutral-50 p-3 text-sm text-neutral-700">
            Job posting is already included with your membership. Nothing to pay here.
          </p>
        )}

        {isMember ? (
          <div className="mt-6 rounded-2xl border border-neutral-900 bg-neutral-900 p-5 text-white">
            <p className="font-bold">Included with your membership</p>
            <p className="mt-1 text-sm text-neutral-300">
              You post free and unlimited as a paying Growth or KatisoBiz member. No jobs plan needed.
            </p>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            <form action={startJobsUpgrade} className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
              <input type="hidden" name="plan" value="starter" />
              <p className="font-bold text-neutral-900">R45 a month</p>
              <p className="mt-1 text-sm text-neutral-600">5 posts a month. For businesses hiring regularly.</p>
              <button
                type="submit"
                className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800"
              >
                Choose R45 a month
              </button>
            </form>

            <form action={startJobsUpgrade} className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
              <input type="hidden" name="plan" value="unlimited" />
              <p className="font-bold text-neutral-900">R69 a month</p>
              <p className="mt-1 text-sm text-neutral-600">Unlimited posts. For recruiters and agencies.</p>
              <button
                type="submit"
                className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800"
              >
                Choose R69 a month
              </button>
            </form>

            <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-5">
              <p className="text-sm font-bold text-neutral-900">Or join KatisoBiz from R49 a month</p>
              <p className="mt-1 text-sm text-neutral-600">
                Paying KatisoBiz members post jobs free and unlimited, and get quoting, invoicing and slips
                for their business too.
              </p>
              <a
                href="https://katisobiz.co.za"
                className="mt-2 inline-block text-sm font-semibold text-neutral-900 underline underline-offset-2"
              >
                See KatisoBiz
              </a>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-neutral-400">Secure payment via Paystack. Cancel anytime.</p>
      </section>
      <JobsFooter />
    </main>
  );
}
