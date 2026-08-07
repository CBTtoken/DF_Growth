import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyJobsEmployer } from "@/lib/jobs/employer";
import { VacancyComposer } from "@/components/jobs/VacancyComposer";
import { JobsFooter } from "@/components/jobs/JobsFooter";
import { jobsPath } from "@/lib/jobs/host";

export const metadata: Metadata = {
  title: { absolute: "Post a job | KatisoBiz Jobs" },
  robots: { index: false, follow: false },
};

export default async function PostVacancyPage() {
  const employer = await getMyJobsEmployer();
  if (!employer) redirect(await jobsPath("/employers"));

  const [dashboardHref, upgradeHref] = await Promise.all([jobsPath("/employer"), jobsPath("/employer/upgrade")]);

  // Out of allowance: the page says so instead of rendering a form the
  // server would reject anyway. The server action re-checks regardless.
  if (!employer.entitlement.canPostNow) {
    return (
      <main className="flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
          <h1 className="text-2xl font-bold text-neutral-900">
            {employer.entitlement.lapsed ? "Your subscription has ended" : "You have used your available posts"}
          </h1>
          <p className="text-sm text-neutral-600">{employer.entitlement.label}</p>
          <Link
            href={upgradeHref}
            className="mt-2 inline-flex w-full max-w-xs items-center justify-center rounded-full bg-neutral-900 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800"
          >
            {employer.entitlement.lapsed ? "Restart my plan" : "Get more posts"}
          </Link>
          <Link href={dashboardHref} className="text-sm font-medium text-neutral-500 hover:text-neutral-900">
            Back to my jobs
          </Link>
        </section>
        <JobsFooter />
      </main>
    );
  }

  const admin = createAdminClient();
  const { data: taxonomy } = await admin.from("jobs_taxonomy").select("id, slug, label, category").order("sort_order");

  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
        <Link href={dashboardHref} className="text-sm font-medium text-neutral-500 hover:text-neutral-900">
          &larr; My jobs
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-neutral-900">Post a job</h1>
        <p className="mt-1 text-sm text-neutral-500">{employer.entitlement.label}</p>
        <div className="mt-6">
          <VacancyComposer taxonomy={taxonomy ?? []} dashboardHref={dashboardHref} />
        </div>
      </section>
      <JobsFooter />
    </main>
  );
}
