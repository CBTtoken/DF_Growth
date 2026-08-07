import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyJobsEmployer } from "@/lib/jobs/employer";
import { JobsFooter } from "@/components/jobs/JobsFooter";
import { jobsPath } from "@/lib/jobs/host";
import {
  AVAILABILITY_OPTIONS,
  experienceLevelLabel,
  type WorkHistoryEntry,
} from "@/lib/jobs/cv-conversation";
import { setApplicationStatus, toggleSavedCandidate } from "@/app/jobs/employer/applicants/actions";

export const metadata: Metadata = {
  title: { absolute: "Applicant | KatisoBiz Jobs" },
  robots: { index: false, follow: false },
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  reviewing: "Reviewing",
  shortlisted: "Shortlisted",
  declined: "Declined",
};

// One applicant's full CV, shown to the employer they applied to.
// Applying IS the consent to be seen by this employer, listed or not --
// but the anti-scraping rule is unchanged: the view is logged against the
// employer account before the identity is fetched, every time.
export default async function ApplicantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employer = await getMyJobsEmployer();
  if (!employer) redirect(await jobsPath("/employers"));

  const admin = createAdminClient();
  const { data: application } = await admin
    .from("jobs_applications")
    .select("id, candidate_id, vacancy_title, status, created_at")
    .eq("id", id)
    .eq("employer_id", employer.id)
    .maybeSingle();

  if (!application) return notFound();

  // Log first, fetch second (the find-people rule, applied identically).
  await admin
    .from("jobs_record_views")
    .insert({ employer_id: employer.id, candidate_id: application.candidate_id });

  const { data: c } = await admin
    .from("jobs_candidates")
    .select(
      "id, full_name, phone, email, years_experience, experience_level, suburb, province, availability, skills, work_history, summary, secondary_ofo_codes, jobs_ofo_occupations(title)",
    )
    .eq("id", application.candidate_id)
    .is("deleted_at", null)
    .maybeSingle();

  const backHref = await jobsPath("/employer/applicants");

  if (!c) {
    return (
      <main className="flex flex-1 flex-col">
        <section className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
          <Link href={backHref} className="text-sm font-medium text-neutral-500 hover:text-neutral-900">
            &larr; Applicants
          </Link>
          <p className="mt-6 rounded-xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-500">
            This person has deleted their CV, so it is no longer available.
          </p>
        </section>
        <JobsFooter />
      </main>
    );
  }

  const { data: saved } = await admin
    .from("jobs_saved_candidates")
    .select("id")
    .eq("employer_id", employer.id)
    .eq("candidate_id", c.id)
    .maybeSingle();

  const primaryTitle = (c.jobs_ofo_occupations as unknown as { title: string } | null)?.title;
  const alsoOpenTo = ((c.secondary_ofo_codes ?? []) as { title: string }[]).map((s) => s.title);
  const availabilityLabel = AVAILABILITY_OPTIONS.find((a) => a.id === c.availability)?.label;
  const workHistory = (c.work_history ?? []) as WorkHistoryEntry[];

  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Link href={backHref} className="text-sm font-medium text-neutral-500 hover:text-neutral-900">
          &larr; Applicants
        </Link>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Applied for: {application.vacancy_title}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900">{c.full_name ?? "Unnamed"}</h1>
        <p className="mt-1 text-neutral-600">
          {[
            primaryTitle,
            experienceLevelLabel(c.experience_level),
            c.years_experience != null ? `${c.years_experience} years' experience` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="mt-1 text-neutral-600">
          {[c.suburb, c.province].filter(Boolean).join(", ")}
          {availabilityLabel ? ` · Available: ${availabilityLabel}` : ""}
        </p>
        {alsoOpenTo.length > 0 && (
          <p className="mt-1 text-sm text-neutral-500">Also open to: {alsoOpenTo.join(", ")}</p>
        )}

        <div className="mt-4 rounded-xl border border-neutral-900 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Contact details</p>
          {c.phone && (
            <a
              href={`tel:${c.phone.replace(/\s/g, "")}`}
              className="mt-1 block text-sm text-neutral-700 underline underline-offset-2"
            >
              {c.phone}
            </a>
          )}
          {c.email && <p className="mt-1 text-sm text-neutral-700">{c.email}</p>}
          <p className="mt-3 text-xs text-neutral-400">
            This view has been recorded. Never ask a candidate to pay for anything.
          </p>
        </div>

        {c.summary && <p className="mt-6 text-neutral-800">{c.summary}</p>}

        {(c.skills ?? []).length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Skills</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(c.skills ?? []).map((s: string) => (
                <span key={s} className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-700">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {workHistory.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Work history</p>
            <ul className="mt-2 flex flex-col gap-3">
              {workHistory.map((w, i) => (
                <li key={i} className="rounded-xl border border-neutral-100 p-3">
                  <p className="font-semibold text-neutral-900">
                    {w.role} at {w.employer}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {w.start} to {w.current ? "present" : w.end}
                  </p>
                  {w.description && <p className="mt-1 text-sm text-neutral-700">{w.description}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-2">
          <form action={setApplicationStatus} className="flex flex-wrap gap-2">
            <input type="hidden" name="applicationId" value={application.id} />
            {(["reviewing", "shortlisted", "declined"] as const).map((s) => (
              <button
                key={s}
                type="submit"
                name="status"
                value={s}
                className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                  application.status === s
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </form>
          <form action={toggleSavedCandidate}>
            <input type="hidden" name="candidateId" value={c.id} />
            <button
              type="submit"
              className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:border-neutral-400"
            >
              {saved ? "Saved, tap to unsave" : "Save for later"}
            </button>
          </form>
        </div>
      </section>
      <JobsFooter />
    </main>
  );
}
