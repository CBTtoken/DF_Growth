import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyJobsEmployer } from "@/lib/jobs/employer";
import { recentBillingCutoff } from "@/lib/bizup/billing";
import { JobsFooter } from "@/components/jobs/JobsFooter";
import { jobsPath } from "@/lib/jobs/host";

export const metadata: Metadata = {
  title: { absolute: "Payment | KatisoBiz Jobs" },
  robots: { index: false, follow: false },
};

// The Paystack return page, bizup's done-page shape: the browser return
// never activates anything (it can be missed, closed or replayed), the
// webhook is the authority. This page just reads whether the webhook's
// billing event has landed yet, and says refresh if not.
export default async function JobsUpgradeDonePage() {
  const employer = await getMyJobsEmployer();
  if (!employer) redirect(await jobsPath("/employers"));

  const admin = createAdminClient();
  const { data: recent } = await admin
    .from("jobs_billing_events")
    .select("plan, kind, created_at")
    .eq("employer_id", employer.id)
    .gte("created_at", recentBillingCutoff())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const dashboardHref = await jobsPath("/employer");

  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        {recent ? (
          <>
            <h1 className="text-2xl font-bold text-neutral-900">You are on the {recent.plan === "unlimited" ? "R69 unlimited" : "R45"} plan</h1>
            <p className="text-sm text-neutral-600">
              {recent.plan === "unlimited"
                ? "Post as many jobs as you need."
                : "You have 5 posts a month. They reset on the 1st."}
            </p>
            <Link
              href={dashboardHref}
              className="mt-2 inline-flex w-full max-w-xs items-center justify-center rounded-full bg-neutral-900 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800"
            >
              Post a job
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-neutral-900">Payment received</h1>
            <p className="text-sm text-neutral-600">
              We are confirming it with the bank, which usually takes a few seconds. Give it a moment and
              refresh this page.
            </p>
            <Link href={dashboardHref} className="text-sm font-medium text-neutral-500 hover:text-neutral-900">
              Back to my jobs
            </Link>
          </>
        )}
      </section>
      <JobsFooter />
    </main>
  );
}
