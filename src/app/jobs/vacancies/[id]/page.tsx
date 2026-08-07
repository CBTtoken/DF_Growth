import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { JobsFooter } from "@/components/jobs/JobsFooter";
import { JobsHeader } from "@/components/jobs/JobsHeader";
import { ReportListingForm } from "@/components/jobs/ReportListingForm";
import { reportVacancy } from "@/app/jobs/find-people/actions";
import { applyToVacancy } from "@/app/jobs/vacancies/actions";
import { jobsCanonical, jobsPath } from "@/lib/jobs/host";
import { vacancyIsExpired } from "@/lib/jobs/entitlements";
import { VacancyAdvert } from "@/components/jobs/VacancyAdvert";

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
  temp: "Temporary",
};

const VACANCY_COLUMNS =
  "id, title, description, suburb, province, employment_type, pay_text, salary_public, status, expires_at, created_at, experience_level, starts_text, closing_date, duties, must_have, nice_to_have, qualifications, selection_process, jobs_ofo_occupations(title), jobs_employers!inner(business_name, phone)";

// An expired vacancy's permalink stays alive (the Board's own rule: the
// indexed page survives) but says plainly that it is no longer open, and
// browse never lists it. Held and removed posts are a hard 404.
async function getVacancy(id: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("jobs_vacancies").select(VACANCY_COLUMNS).eq("id", id).maybeSingle();
  if (!data || data.status === "held" || data.status === "removed") return null;
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const v = await getVacancy(id);
  if (!v) return { title: { absolute: "Not found | KatisoBiz Jobs" } };

  const employer = (v.jobs_employers as unknown as { business_name: string } | null)?.business_name;
  return {
    title: { absolute: `${v.title} | ${employer ?? "KatisoBiz Jobs"}` },
    description: `${v.title} in ${v.suburb}, ${v.province}. ${EMPLOYMENT_TYPE_LABELS[v.employment_type]}. Applying is free.`,
    alternates: { canonical: jobsCanonical(`/vacancies/${id}`) },
  };
}

export default async function VacancyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await getVacancy(id);
  if (!v) return notFound();

  const employer = v.jobs_employers as unknown as { business_name: string; phone: string | null } | null;
  const roleLabel = (v.jobs_ofo_occupations as unknown as { title: string } | null)?.title;
  const expired = vacancyIsExpired(v.expires_at);
  const backHref = await jobsPath("/vacancies");

  return (
    <>
      <JobsHeader />
    <main className="flex flex-1 flex-col">
      <section className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Link href={backHref} className="text-sm font-medium text-neutral-500 hover:text-neutral-900">
          &larr; All jobs
        </Link>

        {expired && (
          <p className="mt-4 rounded-xl bg-neutral-100 p-3 text-sm text-neutral-600">
            This position is no longer open. It ran its 30 days and was not renewed.
          </p>
        )}

        <div className="mt-4">
          <VacancyAdvert
            v={{
              title: v.title,
              employerName: employer?.business_name ?? null,
              roleTitle: roleLabel ?? null,
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
              salaryPublic: v.salary_public ?? true,
              description: v.description,
            }}
          />
        </div>

        {!expired && employer && (
          <div className="mt-8 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
            <p className="text-sm font-bold text-neutral-900">How to apply</p>
            <p className="mt-1 text-sm text-neutral-700">
              Apply with your KatisoBiz CV in one tap, free. {employer.business_name} sees your CV and can
              contact you directly.
            </p>
            <form action={applyToVacancy} className="mt-3">
              <input type="hidden" name="vacancyId" value={id} />
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-full bg-neutral-900 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800"
              >
                Apply with my CV
              </button>
            </form>
            {employer.phone && (
              <p className="mt-3 text-sm text-neutral-600">
                Or contact {employer.business_name} on{" "}
                <a href={`tel:${employer.phone.replace(/\s/g, "")}`} className="font-semibold text-neutral-900 underline-offset-2 hover:underline">
                  {employer.phone}
                </a>{" "}
                and mention you saw the job on KatisoBiz Jobs.
              </p>
            )}
          </div>
        )}

        <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          Applying for a job never costs money. No real employer asks you to pay for training, a uniform,
          transport, or an admin fee before you start. If anyone asks you to pay, report the post below.
        </div>

        <div className="mt-4">
          <ReportListingForm targetId={id} action={reportVacancy} label="Report this job" />
        </div>
      </section>
      <JobsFooter />
    </main>
    </>
  );
}
