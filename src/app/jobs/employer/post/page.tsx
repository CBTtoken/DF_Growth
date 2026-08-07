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

export default async function PostVacancyPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const employer = await getMyJobsEmployer();
  if (!employer) redirect(await jobsPath("/employers"));

  const [dashboardHref, upgradeHref] = await Promise.all([jobsPath("/employer"), jobsPath("/employer/upgrade")]);

  // Editing an existing draft (arrived from the preview's "Change
  // something"): prefill everything, save updates the same row.
  let initialValues = undefined;
  if (edit && /^[0-9a-f-]{36}$/.test(edit)) {
    const admin = createAdminClient();
    const { data: draft } = await admin
      .from("jobs_vacancies")
      .select(
        "id, title, suburb, province, employment_type, experience_level, ofo_occupation_code, starts_text, closing_date, duties, must_have, nice_to_have, qualifications, selection_process, pay_text, salary_public, jobs_ofo_occupations(title)",
      )
      .eq("id", edit)
      .eq("employer_id", employer.id)
      .in("status", ["draft", "held"])
      .maybeSingle();
    if (draft) {
      const occupationTitle = (draft.jobs_ofo_occupations as unknown as { title: string } | null)?.title;
      initialValues = {
        vacancyId: draft.id,
        occupation:
          draft.ofo_occupation_code && occupationTitle
            ? { code: draft.ofo_occupation_code, title: occupationTitle }
            : null,
        experienceLevel: draft.experience_level ?? "",
        title: draft.title ?? "",
        suburb: draft.suburb ?? "",
        province: draft.province ?? "",
        employmentType: draft.employment_type ?? "full_time",
        startsText: draft.starts_text ?? "",
        closingDate: draft.closing_date ?? "",
        duties: draft.duties ?? "",
        mustHave: draft.must_have ?? "",
        niceToHave: draft.nice_to_have ?? "",
        qualifications: draft.qualifications ?? "",
        selectionProcess: draft.selection_process ?? "",
        payText: draft.pay_text ?? "",
        salaryPublic: draft.salary_public ?? true,
      };
    }
  }

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

  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
        <Link href={dashboardHref} className="text-sm font-medium text-neutral-500 hover:text-neutral-900">
          &larr; My jobs
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-neutral-900">Post a job</h1>
        <p className="mt-1 text-sm text-neutral-500">{employer.entitlement.label}</p>
        <div className="mt-6">
          <VacancyComposer initialValues={initialValues} />
        </div>
      </section>
      <JobsFooter />
    </main>
  );
}
