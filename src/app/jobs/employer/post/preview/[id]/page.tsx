import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyJobsEmployer } from "@/lib/jobs/employer";
import { JobsFooter } from "@/components/jobs/JobsFooter";
import { VacancyAdvert } from "@/components/jobs/VacancyAdvert";
import { publishVacancy } from "@/app/jobs/employer/post/actions";
import { jobsPath } from "@/lib/jobs/host";

export const metadata: Metadata = {
  title: { absolute: "Preview your advert | KatisoBiz Jobs" },
  robots: { index: false, follow: false },
};

// The pre-publish review (handoff Job 6): the draft rendered through the
// exact component the public page uses, so what the employer approves is
// what an applicant gets, with publish as the one deliberate action.
export default async function VacancyPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ held?: string }>;
}) {
  const { id } = await params;
  const { held } = await searchParams;
  const employer = await getMyJobsEmployer();
  if (!employer) redirect(await jobsPath("/employers"));

  const admin = createAdminClient();
  const { data: v } = await admin
    .from("jobs_vacancies")
    .select(
      "id, title, suburb, province, employment_type, experience_level, starts_text, closing_date, duties, must_have, nice_to_have, qualifications, selection_process, pay_text, salary_public, description, status, jobs_ofo_occupations(title)",
    )
    .eq("id", id)
    .eq("employer_id", employer.id)
    .maybeSingle();

  if (!v) return notFound();

  const [editHref, dashboardHref] = await Promise.all([
    jobsPath(`/employer/post?edit=${v.id}`),
    jobsPath("/employer"),
  ]);

  return (
    <main className="flex flex-1 flex-col bg-neutral-50">
      <section className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <Link href={dashboardHref} className="text-sm font-medium text-neutral-500 hover:text-neutral-900">
          &larr; My jobs
        </Link>

        {held === "1" || v.status === "held" ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Your post is being reviewed by a person first, usually within a day. It goes live the moment it
            is approved. One common reason: posts may never ask candidates to pay for anything.
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
            This is exactly how applicants will see your advert. Check it, then publish, or go back and
            change anything.
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
          <VacancyAdvert
            v={{
              title: v.title,
              employerName: employer.businessName,
              roleTitle: (v.jobs_ofo_occupations as unknown as { title: string } | null)?.title ?? null,
              experienceLevel: v.experience_level,
              employmentType: v.employment_type,
              suburb: v.suburb,
              province: v.province,
              startsText: v.starts_text,
              closingDate: v.closing_date,
              duties: v.duties,
              mustHave: v.must_have,
              niceToHave: v.nice_to_have,
              qualifications: v.qualifications,
              selectionProcess: v.selection_process,
              payText: v.pay_text,
              salaryPublic: v.salary_public,
              description: v.description,
            }}
          />
        </div>

        {v.status !== "held" && (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <form action={publishVacancy} className="flex-1">
              <input type="hidden" name="vacancyId" value={v.id} />
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-full bg-neutral-900 px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800"
              >
                Publish for 30 days
              </button>
            </form>
            <Link
              href={editHref}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-neutral-900 px-6 py-4 text-base font-semibold text-neutral-900 transition hover:bg-white"
            >
              Change something
            </Link>
          </div>
        )}
      </section>
      <JobsFooter />
    </main>
  );
}
