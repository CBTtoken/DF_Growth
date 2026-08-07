import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyJobsEmployer } from "@/lib/jobs/employer";
import { JobsFooter } from "@/components/jobs/JobsFooter";
import { jobsPath } from "@/lib/jobs/host";
import { setApplicationStatus } from "@/app/jobs/employer/applicants/actions";

export const metadata: Metadata = {
  title: { absolute: "Applicants | KatisoBiz Jobs" },
  robots: { index: false, follow: false },
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  reviewing: "Reviewing",
  shortlisted: "Shortlisted",
  declined: "Declined",
};

// Every application against this employer, grouped by vacancy, with the
// status pipe as one-tap buttons. This is what the employer registration
// exists for (handoff Job 7).
export default async function ApplicantsPage({
  searchParams,
}: {
  searchParams: Promise<{ vacancy?: string }>;
}) {
  const { vacancy: vacancyFilter } = await searchParams;
  const employer = await getMyJobsEmployer();
  if (!employer) redirect(await jobsPath("/employers"));

  const admin = createAdminClient();
  let query = admin
    .from("jobs_applications")
    .select(
      "id, vacancy_id, vacancy_title, status, created_at, cover_message, jobs_candidates(id, full_name, years_experience, experience_level, suburb, province, jobs_ofo_occupations(title))",
    )
    .eq("employer_id", employer.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (vacancyFilter && /^[0-9a-f-]{36}$/.test(vacancyFilter)) {
    query = query.eq("vacancy_id", vacancyFilter);
  }
  const { data: applications, error } = await query;
  if (error) console.error("Failed to load applications", error);

  const [dashboardHref, applicantPrefix] = await Promise.all([
    jobsPath("/employer"),
    jobsPath("/employer/applicants"),
  ]);

  // Group by vacancy title, newest vacancy first (insertion order of the
  // already-sorted list).
  const groups = new Map<string, NonNullable<typeof applications>>();
  for (const a of applications ?? []) {
    const key = a.vacancy_title;
    const list = groups.get(key) ?? [];
    list.push(a);
    groups.set(key, list);
  }

  return (
    <main className="flex flex-1 flex-col bg-neutral-50">
      <section className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <Link href={dashboardHref} className="text-sm font-medium text-neutral-500 hover:text-neutral-900">
          &larr; My jobs
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-neutral-900">Applicants</h1>

        {(applications ?? []).length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
            No applications yet. When someone applies to one of your posts with their CV, they appear here.
          </p>
        ) : (
          <div className="mt-6 flex flex-col gap-6">
            {[...groups.entries()].map(([title, list]) => (
              <div key={title}>
                <h2 className="text-sm font-bold text-neutral-900">
                  {title} <span className="font-normal text-neutral-400">({list.length})</span>
                </h2>
                <ul className="mt-2 flex flex-col gap-2">
                  {list.map((a) => {
                    const c = a.jobs_candidates as unknown as {
                      id: string;
                      full_name: string | null;
                      years_experience: number | null;
                      experience_level: string | null;
                      suburb: string | null;
                      province: string | null;
                      jobs_ofo_occupations: { title: string } | null;
                    } | null;
                    if (!c) {
                      return (
                        <li key={a.id} className="rounded-xl border border-neutral-100 bg-white p-4 text-sm text-neutral-500">
                          This person has deleted their CV.
                        </li>
                      );
                    }
                    return (
                      <li key={a.id} className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <Link
                            href={`${applicantPrefix}/${a.id}`}
                            className="font-semibold text-neutral-900 underline-offset-2 hover:underline"
                          >
                            {c.full_name ?? "Unnamed"}
                          </Link>
                          <span className="text-xs text-neutral-400">
                            {STATUS_LABELS[a.status] ?? a.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-neutral-600">
                          {[
                            c.jobs_ofo_occupations?.title,
                            c.years_experience != null ? `${c.years_experience} years` : null,
                            [c.suburb, c.province].filter(Boolean).join(", "),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {/* The first line of what they wrote, so a list of
                            twenty applicants can be triaged without opening
                            twenty CVs. Clamped, not truncated with an
                            ellipsis, so it reflows properly on a phone. */}
                        {a.cover_message && (
                          <p className="mt-1.5 line-clamp-2 text-sm italic text-neutral-500">
                            &ldquo;{a.cover_message}&rdquo;
                          </p>
                        )}
                        <form action={setApplicationStatus} className="mt-3 flex flex-wrap gap-2">
                          <input type="hidden" name="applicationId" value={a.id} />
                          {(["reviewing", "shortlisted", "declined"] as const).map((s) => (
                            <button
                              key={s}
                              type="submit"
                              name="status"
                              value={s}
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                                a.status === s
                                  ? "border-neutral-900 bg-neutral-900 text-white"
                                  : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"
                              }`}
                            >
                              {STATUS_LABELS[s]}
                            </button>
                          ))}
                        </form>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
      <JobsFooter />
    </main>
  );
}
