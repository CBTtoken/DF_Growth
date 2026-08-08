import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { JobsFooter } from "@/components/jobs/JobsFooter";
import { jobsPath } from "@/lib/jobs/host";
import { hasJobsEmployer } from "@/lib/jobs/employer";
import {
  AVAILABILITY_OPTIONS,
  experienceLevelLabel,
  type CertificationEntry,
  type EducationEntry,
  type WorkHistoryEntry,
} from "@/lib/jobs/cv-conversation";
import { assembleCv } from "@/lib/jobs/cv-assembly";
import { runCvCheck, outstandingCount } from "@/lib/jobs/cv-check";
import {
  updateAvailability,
  toggleListed,
  updateMyDetails,
  useDraftInstead,
  discardDraft,
} from "@/app/jobs/dashboard/actions";
import { pendingDraftForUser } from "@/lib/jobs/claim-draft";
import { unreadByApplication } from "@/lib/jobs/messages";

export const metadata: Metadata = {
  title: { absolute: "My dashboard | KatisoBiz Jobs" },
  robots: { index: false, follow: false },
};

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  new: "Sent",
  reviewing: "Being reviewed",
  shortlisted: "Shortlisted",
  declined: "Not successful this time",
  withdrawn: "You pulled out",
};

// The landing place after login and after finishing the CV (handoff Job 5:
// completing the flow must never dump the person on the home page). One
// screen carries the CV, the listing, availability, applications, and
// matching jobs. Phone first, no client JS beyond plain forms.
export default async function SeekerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ applied?: string }>;
}) {
  const { applied } = await searchParams;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(await jobsPath("/login"));

  const admin = createAdminClient();
  const { data: candidate } = await admin
    .from("jobs_candidates")
    .select(
      "id, full_name, phone, email, ofo_occupation_code, secondary_ofo_codes, experience_level, years_experience, suburb, province, availability, skills, work_history, education, certifications, summary, listed, jobs_ofo_occupations(title)",
    )
    .eq("owner_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!candidate) {
    // An employer login with no CV belongs on the employer dashboard; a
    // brand-new login belongs in the builder. Nobody lands nowhere.
    if (await hasJobsEmployer(user.id)) redirect(await jobsPath("/employer"));
    redirect(await jobsPath("/cv"));
  }

  const primaryTitle = (candidate.jobs_ofo_occupations as unknown as { title: string } | null)?.title;
  const secondaryTitles = ((candidate.secondary_ofo_codes ?? []) as { code: string; title: string }[]).map(
    (s) => s.title,
  );
  const occupationCodes = [
    candidate.ofo_occupation_code,
    ...((candidate.secondary_ofo_codes ?? []) as { code: string }[]).map((s) => s.code),
  ].filter((c): c is string => !!c);

  // The CV check (handoff Job 2), replacing a completeness percentage.
  //
  // A percentage told somebody they were 70% done and nothing at all
  // about which 30% mattered: a missing phone number and a missing
  // availability date counted the same, when one of them means no
  // employer can reach you. The check says what to fix, in the order
  // that matters, in words that name their own job.
  //
  // It checks a DOCUMENT, not a person. It is never shown to an employer,
  // never stored on the row, and never used to order anyone. See
  // lib/jobs/cv-check.ts.
  const workHistory = (candidate.work_history ?? []) as WorkHistoryEntry[];
  const cvAssembly = assembleCv({
    fullName: candidate.full_name,
    phone: candidate.phone,
    email: candidate.email,
    primaryRole: primaryTitle ?? null,
    otherRoles: secondaryTitles,
    yearsExperience: candidate.years_experience,
    suburb: candidate.suburb,
    province: candidate.province,
    availabilityLabel: null,
    skills: (candidate.skills ?? []) as string[],
    workHistory,
    education: (candidate.education ?? []) as EducationEntry[],
    certifications: (candidate.certifications ?? []) as CertificationEntry[],
    summary: candidate.summary,
  });

  const checkItems = runCvCheck({
    fullName: candidate.full_name,
    phone: candidate.phone,
    primaryRole: primaryTitle ?? null,
    suburb: candidate.suburb,
    province: candidate.province,
    summary: candidate.summary,
    skills: (candidate.skills ?? []) as string[],
    workHistory,
    education: (candidate.education ?? []) as EducationEntry[],
    certifications: (candidate.certifications ?? []) as CertificationEntry[],
    assembly: cvAssembly,
  });
  const outstanding = outstandingCount(checkItems);
  // The single most useful thing to say in one line, rather than a list
  // of everything at once.
  const topFix = checkItems.find((i) => !i.done)?.message ?? null;

  // Applications, newest first, snapshots surviving purged vacancies.
  const { data: applications } = await admin
    .from("jobs_applications")
    .select("id, vacancy_id, vacancy_title, employer_name, status, created_at")
    .eq("candidate_id", candidate.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Job alerts: live vacancies in the same branches of work, own province
  // first. Alerts, never scores -- a plain list of real matching posts.
  const subMajors = [...new Set(occupationCodes.map((c) => c.slice(0, 2)))];
  let alerts: { id: string; title: string; suburb: string; province: string; employer: string }[] = [];
  if (subMajors.length > 0) {
    const orFilter = subMajors.map((p) => `ofo_occupation_code.like.${p}*`).join(",");
    const { data: matching } = await admin
      .from("jobs_vacancies")
      .select("id, title, suburb, province, jobs_employers!inner(business_name)")
      .eq("status", "published")
      .gt("expires_at", new Date().toISOString())
      .or(orFilter)
      .order("created_at", { ascending: false })
      .limit(10);
    alerts = (matching ?? [])
      .sort((a, b) =>
        a.province === candidate.province && b.province !== candidate.province
          ? -1
          : b.province === candidate.province && a.province !== candidate.province
            ? 1
            : 0,
      )
      .slice(0, 5)
      .map((v) => ({
        id: v.id,
        title: v.title,
        suburb: v.suburb,
        province: v.province,
        employer: (v.jobs_employers as unknown as { business_name: string } | null)?.business_name ?? "",
      }));
  }

  const [cvHref, pdfHref, docxHref, vacanciesHref, vacancyPrefix, importHref, faqHref, applicationPrefix] = await Promise.all([
    jobsPath("/cv"),
    jobsPath(`/cv/${candidate.id}/pdf`),
    jobsPath(`/cv/${candidate.id}/docx`),
    jobsPath("/vacancies"),
    jobsPath("/vacancies"),
    jobsPath("/cv/import"),
    jobsPath("/faq"),
    jobsPath("/dashboard/applications"),
  ]);

  // Unread messages per application, so the dashboard can point straight at
  // the one that needs an answer.
  const unread_ = await unreadByApplication(
    (applications ?? []).map((a) => a.id),
    "candidate",
  );
  const totalUnread = [...unread_.values()].reduce((sum, n) => sum + n, 0);

  const pendingDraft = await pendingDraftForUser(user.id);
  const availabilityLabel = AVAILABILITY_OPTIONS.find((a) => a.id === candidate.availability)?.label;
  const card = "rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm";

  return (
    <main className="flex flex-1 flex-col bg-neutral-50">
      <section className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        {applied === "1" && (
          <p className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            Application sent. The employer can see your CV and will contact you if it fits.
          </p>
        )}

        {/* The CV they built before logging in, when they already had one.
            Never resolved silently: whichever way we guessed, somebody
            loses work they did on purpose. */}
        {pendingDraft && (
          <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-900">
              You have another CV on this phone that is not saved to your account
            </p>
            <p className="mt-1 text-sm text-amber-800">
              It was built or uploaded before you logged in
              {pendingDraft.occupationTitle ? `, as a ${pendingDraft.occupationTitle.toLowerCase()}` : ""}
              {pendingDraft.jobCount > 0
                ? `, with ${pendingDraft.jobCount} ${pendingDraft.jobCount === 1 ? "job" : "jobs"} of work history`
                : ""}
              . Your account currently uses the CV below. Which one do you want to keep?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={useDraftInstead}>
                <button
                  type="submit"
                  className="rounded-full bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Use the other one
                </button>
              </form>
              <form action={discardDraft}>
                <button
                  type="submit"
                  className="rounded-full border border-amber-300 px-5 py-2.5 text-sm font-semibold text-amber-900"
                >
                  Keep this one
                </button>
              </form>
            </div>
          </div>
        )}

        <h1 className="text-2xl font-bold text-neutral-900">
          {candidate.full_name ? `Good day, ${candidate.full_name.trim().split(" ")[0]}` : "My dashboard"}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {[primaryTitle, ...secondaryTitles].filter(Boolean).join(", ") || "Your CV is waiting to be finished"}
          {experienceLevelLabel(candidate.experience_level) ? ` · ${experienceLevelLabel(candidate.experience_level)}` : ""}
        </p>

        {/* What needs doing, before anything else on the screen.
            Dewald: "the overall dashboards can be much better structured
            of what is important to each one, easier to find and navigate."
            Six equally weighted cards made everything equally urgent,
            which means nothing was. This strip appears only when there is
            genuinely something to do, and it is the only thing above the
            fold when there is. */}
        {(totalUnread > 0 || outstanding > 0 || !candidate.listed) && (
          <div className="mt-6 rounded-2xl border border-accent bg-accent-light p-5">
            <p className="text-sm font-extrabold uppercase tracking-wide text-neutral-ink">
              Worth doing now
            </p>
            <ul className="mt-3 flex flex-col gap-3">
              {totalUnread > 0 && (
                <li className="text-sm text-neutral-800">
                  <strong>
                    {totalUnread} new {totalUnread === 1 ? "message" : "messages"} from an employer.
                  </strong>{" "}
                  Answering quickly is the single thing most likely to get you the job. See it under
                  Jobs I applied for below.
                </li>
              )}
              {topFix && (
                <li className="text-sm text-neutral-800">
                  <strong>{topFix}.</strong>{" "}
                  <Link href={cvHref} className="font-semibold underline underline-offset-2">
                    {outstanding > 1 ? `Fix this and ${outstanding - 1} more` : "Fix it"}
                  </Link>
                </li>
              )}
              {!candidate.listed && (
                <li className="text-sm text-neutral-800">
                  <strong>Employers cannot find you yet.</strong> Switching on being found is how work
                  comes to you instead of you chasing it. It is under Being found below.
                </li>
              )}
            </ul>
          </div>
        )}

        <h2 className="mt-8 text-sm font-extrabold uppercase tracking-wide text-neutral-500">
          Finding work
        </h2>

        <div className="mt-3 flex flex-col gap-4">
          {/* Applications. Each one is now a screen of its own: a status
              word alone told somebody nothing about what to do next, and
              there was no way to say anything or to pull out. */}
          <div className={card}>
            <p className="text-sm font-bold text-neutral-900">
              Jobs I applied for
              {totalUnread > 0 ? (
                <span className="ml-2 rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-white">
                  {totalUnread} new {totalUnread === 1 ? "message" : "messages"}
                </span>
              ) : null}
            </p>
            {(applications ?? []).length === 0 ? (
              <p className="mt-1 text-sm text-neutral-600">
                Nothing yet.{" "}
                <Link href={vacanciesHref} className="font-semibold text-neutral-900 hover:underline">
                  Browse jobs near you
                </Link>{" "}
                and apply with one tap.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {(applications ?? []).map((a) => {
                  const unread = unread_.get(a.id) ?? 0;
                  return (
                    <li key={a.id}>
                      <Link
                        href={`${applicationPrefix}/${a.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2.5 transition hover:bg-neutral-100"
                      >
                        <span className="min-w-0 text-sm text-neutral-800">
                          <span className="font-semibold">{a.vacancy_title}</span>
                          {a.employer_name ? (
                            <span className="text-neutral-500"> · {a.employer_name}</span>
                          ) : null}
                          {unread > 0 && (
                            <span className="mt-0.5 block text-xs font-bold text-accent">
                              {unread} new {unread === 1 ? "message" : "messages"}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-700">
                          {APPLICATION_STATUS_LABELS[a.status] ?? a.status}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Alerts */}
          <div className={card}>
            <p className="text-sm font-bold text-neutral-900">Jobs that match your work</p>
            {alerts.length === 0 ? (
              <p className="mt-1 text-sm text-neutral-600">
                Nothing matching your kind of work right now. New jobs appear here the moment they are posted.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {alerts.map((v) => (
                  <li key={v.id}>
                    <Link
                      href={`${vacancyPrefix}/${v.id}`}
                      className="flex flex-col rounded-xl bg-neutral-50 px-3 py-2.5 transition hover:bg-neutral-100"
                    >
                      <span className="text-sm font-semibold text-neutral-900">{v.title}</span>
                      <span className="text-xs text-neutral-500">
                        {[v.employer, `${v.suburb}, ${v.province}`].filter(Boolean).join(" · ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>

        <h2 className="mt-8 text-sm font-extrabold uppercase tracking-wide text-neutral-500">
          Being found by employers
        </h2>

        <div className="mt-3 flex flex-col gap-4">
          {/* Listing */}
          <div className={card}>
            <p className="text-sm font-bold text-neutral-900">Being found</p>
            <p className="mt-1 text-sm text-neutral-600">
              {candidate.listed
                ? "Employers searching for someone like you can find your CV. Anyone can see the work you do, your skills, your area and your job titles. Your name, your number, where you have worked and what you wrote about yourself show only to logged-in employers."
                : "You are not listed. Employers cannot find you until you switch this on."}
            </p>
            <form action={toggleListed} className="mt-3">
              <input type="hidden" name="listed" value={candidate.listed ? "false" : "true"} />
              <button
                type="submit"
                className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold ${
                  candidate.listed
                    ? "border border-neutral-300 text-neutral-700"
                    : "bg-neutral-900 text-white"
                }`}
              >
                {candidate.listed ? "Stop being found" : "Let employers find me"}
              </button>
            </form>
          </div>

          {/* Availability */}
          <div className={card}>
            <p className="text-sm font-bold text-neutral-900">When can you start?</p>
            {availabilityLabel && <p className="mt-1 text-sm text-neutral-600">Now: {availabilityLabel}</p>}
            <form action={updateAvailability} className="mt-3 flex flex-wrap gap-2">
              {AVAILABILITY_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="submit"
                  name="availability"
                  value={o.id}
                  className={`rounded-full border px-4 py-2 text-sm font-medium ${
                    candidate.availability === o.id
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-white text-neutral-700"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </form>
          </div>

        </div>

        <h2 className="mt-8 text-sm font-extrabold uppercase tracking-wide text-neutral-500">My CV</h2>

        <div className="mt-3 flex flex-col gap-4">
          <div className={card}>
            <p className="text-sm font-bold text-neutral-900">
              {outstanding === 0 ? "Your CV is ready to send" : "Your CV"}
            </p>
            {/* The whole check, not a bar. Each line names the thing to
                do; tapping Edit my CV opens the screen that fixes it. A
                progress bar was the wrong shape of feedback here: it
                measured how much was typed, not whether the document
                would get read. */}
            {outstanding > 0 && (
              <ul className="mt-2 flex flex-col gap-1.5">
                {checkItems
                  .filter((i) => !i.done)
                  .map((i) => (
                    <li key={i.id} className="flex items-start gap-2 text-xs text-neutral-600">
                      <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      <span className="min-w-0">{i.message}</span>
                    </li>
                  ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={cvHref}
                className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Edit my CV
              </Link>
              <a
                href={pdfHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-neutral-900 px-5 py-2.5 text-sm font-semibold text-neutral-900"
              >
                Download PDF
              </a>
              <a
                href={docxHref}
                className="inline-flex items-center justify-center rounded-full border border-neutral-200 px-5 py-2.5 text-sm font-semibold text-neutral-700"
              >
                Download Word
              </a>
            </div>
            {/* The upload route existed but was reachable only from the
                home page and the first question of the builder, which is
                no use to somebody who has already made an account.
                Dewald: "it is not very clear where they can import their
                existing CV." */}
            <Link
              href={importHref}
              className="mt-3 inline-block text-sm font-semibold text-neutral-600 underline underline-offset-2 hover:text-neutral-900"
            >
              Fill this in from a CV file I already have
            </Link>
          </div>

          {/* Profile. This was three lines of read-only text and the
              instruction "Change anything by editing your CV", which was
              not true in any useful sense: the builder opened on its last
              screen and the name and phone questions were ten taps of Back
              away. It is a form now, and the builder can be jumped into
              per section as well. */}
          <div className={card}>
            <p className="text-sm font-bold text-neutral-900">My details</p>
            <p className="mt-1 text-xs text-neutral-500">
              This is what an employer sees and how they reach you. We never ask for your ID number or
              bank details.
            </p>
            <form action={updateMyDetails} className="mt-3 flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs font-semibold text-neutral-600">
                Your name
                <input
                  name="fullName"
                  defaultValue={candidate.full_name ?? ""}
                  required
                  autoComplete="name"
                  className="rounded-xl border border-neutral-200 px-3 py-2.5 text-base font-normal text-neutral-900 outline-none focus:border-neutral-900"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-neutral-600">
                Contact number
                <input
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  defaultValue={candidate.phone ?? ""}
                  required
                  autoComplete="tel"
                  className="rounded-xl border border-neutral-200 px-3 py-2.5 text-base font-normal text-neutral-900 outline-none focus:border-neutral-900"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-neutral-600">
                Contact email
                <input
                  name="email"
                  type="email"
                  inputMode="email"
                  defaultValue={candidate.email ?? user.email ?? ""}
                  autoComplete="email"
                  className="rounded-xl border border-neutral-200 px-3 py-2.5 text-base font-normal text-neutral-900 outline-none focus:border-neutral-900"
                />
              </label>
              <button
                type="submit"
                className="self-start rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Save my details
              </button>
            </form>
            <p className="mt-3 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
              You log in with {user.email}. To change that address, send us a message from the{" "}
              <Link href={faqHref} className="font-semibold text-neutral-700 underline underline-offset-2">
                questions page
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
      <JobsFooter />
    </main>
  );
}
