import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { JobsFooter } from "@/components/jobs/JobsFooter";
import { ReportListingForm } from "@/components/jobs/ReportListingForm";
import { reportVacancy } from "@/app/jobs/find-people/actions";
import { applyToVacancy } from "@/app/jobs/vacancies/actions";
import { jobsCanonical, jobsPath } from "@/lib/jobs/host";
import { vacancyIsExpired } from "@/lib/jobs/entitlements";
import { getSeekerCredits } from "@/lib/jobs/credits";
import { VacancyAdvert } from "@/components/jobs/VacancyAdvert";
import { AimAtThisJob } from "@/components/jobs/AimAtThisJob";

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
  temp: "Temporary",
};

const VACANCY_COLUMNS =
  "id, title, description, suburb, province, employment_type, pay_text, salary_public, status, expires_at, created_at, experience_level, starts_text, closing_date, duties, must_have, nice_to_have, qualifications, selection_process, jobs_ofo_occupations(title), jobs_employers!inner(business_name)";

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

/**
 * Three states, because there are exactly three things that can be true of
 * somebody standing in front of an advert: they can apply right now, they
 * are logged in but have nothing to send yet, or they are a stranger.
 */
type ApplyState =
  | { kind: "ready"; firstName: string; candidateId: string; creditBalance: number }
  | { kind: "no_cv" }
  | { kind: "anonymous" };

async function resolveApplyState(): Promise<ApplyState> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: "anonymous" };

  const admin = createAdminClient();
  const { data: candidate } = await admin
    .from("jobs_candidates")
    .select("id, full_name")
    .eq("owner_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  // A name is the one field an application is useless without, and it is
  // the same test applyToVacancy applies server-side, so the button never
  // promises something the action will refuse.
  if (!candidate?.full_name?.trim()) return { kind: "no_cv" };

  const credits = await getSeekerCredits(user.id);
  return {
    kind: "ready",
    firstName: candidate.full_name.trim().split(" ")[0],
    candidateId: candidate.id,
    creditBalance: credits.balance,
  };
}

// Dewald, 9 August: "We should not have the employer's contact details
// visible to the seeker or public, they can apply only."
//
// The phone number is no longer selected from the database on this page at
// all, rather than fetched and left unrendered: a column that never
// arrives cannot be leaked by a later edit. Contact now happens through
// the application thread, which is the same reason the CV is not attached
// to the alert email: both sides get a record, and neither side's details
// are handed to a stranger who has not applied.
function ApplyBox({
  vacancyId,
  vacancyTitle,
  employerName,
  state,
  cvHref,
  cvFilePrefix,
  loginHref,
}: {
  vacancyId: string;
  vacancyTitle: string;
  employerName: string;
  state: ApplyState;
  cvHref: string;
  cvFilePrefix: string;
  loginHref: string;
}) {
  return (
    <div className="mt-8 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
      <p className="text-sm font-bold text-neutral-900">How to apply</p>

      {state.kind === "ready" && (
        <>
          <p className="mt-1 text-sm text-neutral-700">
            One tap, free. {employerName} gets your CV and can contact you directly.
          </p>
          <form action={applyToVacancy} className="mt-3 flex flex-col gap-3">
            <input type="hidden" name="vacancyId" value={vacancyId} />
            <label className="flex flex-col gap-1 text-xs font-semibold text-neutral-600">
              Anything you want to say to {employerName}? Optional.
              <textarea
                name="coverMessage"
                rows={3}
                maxLength={600}
                placeholder="I have five years doing exactly this work and I live ten minutes away."
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-base font-normal text-neutral-900 outline-none focus:border-neutral-900"
              />
              <span className="font-normal text-neutral-400">
                A sentence or two about why this job suits you. Your CV goes either way.
              </span>
            </label>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-full bg-neutral-900 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800"
            >
              Apply with my CV
            </button>
          </form>

          {/* Below Apply, never above it. Applying is what this page is
              for and it is free; aiming the CV first is an option, and an
              option that outranked the free action would be a paywall
              wearing a helpful face. */}
          <AimAtThisJob
            candidateId={state.candidateId}
            vacancyId={vacancyId}
            vacancyTitle={vacancyTitle}
            employerName={employerName}
            balance={state.creditBalance}
            cvHref={cvFilePrefix}
          />
        </>
      )}

      {state.kind === "no_cv" && (
        <>
          <p className="mt-1 text-sm text-neutral-700">
            You need a CV before you can apply. It takes a few minutes on your phone, it is free, and we
            bring you straight back to this job afterwards.
          </p>
          <form action={applyToVacancy} className="mt-3">
            <input type="hidden" name="vacancyId" value={vacancyId} />
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-full bg-neutral-900 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800"
            >
              Build my CV and apply
            </button>
          </form>
        </>
      )}

      {state.kind === "anonymous" && (
        <>
          <p className="mt-1 text-sm text-neutral-700">
            Applying is free and takes one tap once you have a CV here. Build one now and we bring you
            straight back to this job.
          </p>
          <form action={applyToVacancy} className="mt-3">
            <input type="hidden" name="vacancyId" value={vacancyId} />
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-full bg-neutral-900 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800"
            >
              Build a free CV and apply
            </button>
          </form>
          <p className="mt-2 text-center text-sm text-neutral-600">
            Already have an account?{" "}
            <Link href={loginHref} className="font-semibold text-neutral-900 underline underline-offset-2">
              Log in
            </Link>{" "}
            or{" "}
            <Link href={cvHref} className="font-semibold text-neutral-900 underline underline-offset-2">
              upload a CV you already have
            </Link>
            .
          </p>
        </>
      )}

      <p className="mt-3 text-xs text-neutral-500">
        {employerName} will reply through KatisoBiz Jobs, so you both have a record of what was said.
      </p>
    </div>
  );
}

export default async function VacancyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await getVacancy(id);
  if (!v) return notFound();

  const employer = v.jobs_employers as unknown as { business_name: string } | null;
  const roleLabel = (v.jobs_ofo_occupations as unknown as { title: string } | null)?.title;
  const expired = vacancyIsExpired(v.expires_at);
  const [backHref, cvHref, loginHref] = await Promise.all([
    jobsPath("/vacancies"),
    jobsPath("/cv"),
    jobsPath("/login"),
  ]);

  // What the apply box should say depends on what this visitor already
  // has, and until now it said the same thing to everybody: "Apply with my
  // CV", which for a logged-out visitor silently meant "start building a
  // CV and forget this job". Telling somebody what will happen before they
  // tap is the whole of the fix.
  const applyState = await resolveApplyState();

  return (
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
          <ApplyBox
            vacancyId={id}
            vacancyTitle={v.title}
            employerName={employer.business_name}
            state={applyState}
            cvHref={cvHref}
            cvFilePrefix={cvHref}
            loginHref={loginHref}
          />
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
  );
}
