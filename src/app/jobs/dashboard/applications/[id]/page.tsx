import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { JobsFooter } from "@/components/jobs/JobsFooter";
import { jobsPath } from "@/lib/jobs/host";
import { loadThread, markThreadRead, MESSAGE_MAX } from "@/lib/jobs/messages";
import { MessageThread } from "@/components/jobs/MessageThread";
import {
  withdrawApplication,
  reapplyApplication,
  sendCandidateMessage,
} from "@/app/jobs/dashboard/applications/actions";

export const metadata: Metadata = {
  title: { absolute: "My application | KatisoBiz Jobs" },
  robots: { index: false, follow: false },
};

const STATUS_LABELS: Record<string, string> = {
  new: "Sent",
  reviewing: "Being reviewed",
  shortlisted: "Shortlisted",
  declined: "Not successful this time",
  withdrawn: "You pulled out",
};

const STATUS_HELP: Record<string, string> = {
  new: "The employer has your CV. They have not opened it yet.",
  reviewing: "The employer is going through the applications now.",
  shortlisted: "You are on their shortlist. Keep an eye out for a message.",
  declined: "They went with somebody else this time. It is not a reflection on you, and it does not affect any other application.",
  withdrawn: "You told them you are no longer available for this one.",
};

// One application, end to end: where it stands, what was said, and the two
// things the applicant can actually do about it. This screen did not exist
// before 9 August 2026: an application was a row on a list with a status
// word, and nothing could be said in either direction.
export default async function MyApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(await jobsPath("/login"));

  const admin = createAdminClient();
  const { data: candidate } = await admin
    .from("jobs_candidates")
    .select("id")
    .eq("owner_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!candidate) redirect(await jobsPath("/cv"));

  const { data: application } = await admin
    .from("jobs_applications")
    .select("id, vacancy_id, vacancy_title, employer_name, status, cover_message, created_at")
    .eq("id", id)
    .eq("candidate_id", candidate.id)
    .maybeSingle();

  if (!application) return notFound();

  // Opening the thread is what marks the employer's messages read.
  await markThreadRead(application.id, "candidate");
  const thread = await loadThread(application.id);

  const [dashboardHref, vacancyHref] = await Promise.all([
    jobsPath("/dashboard"),
    jobsPath(`/vacancies/${application.vacancy_id ?? ""}`),
  ]);

  const applied = new Date(application.created_at).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const card = "rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm";

  return (
    <main className="flex flex-1 flex-col bg-neutral-50">
      <section className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <Link href={dashboardHref} className="text-sm font-medium text-neutral-500 hover:text-neutral-900">
          &larr; My dashboard
        </Link>

        <h1 className="mt-3 text-2xl font-bold text-neutral-900">{application.vacancy_title}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {application.employer_name} · Applied {applied}
        </p>

        <div className={`mt-6 ${card}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Where it stands</p>
          <p className="mt-1 text-lg font-bold text-neutral-900">
            {STATUS_LABELS[application.status] ?? application.status}
          </p>
          <p className="mt-1 text-sm text-neutral-600">{STATUS_HELP[application.status] ?? ""}</p>

          {application.status !== "withdrawn" ? (
            <form action={withdrawApplication} className="mt-4 border-t border-neutral-100 pt-4">
              <input type="hidden" name="applicationId" value={application.id} />
              <p className="text-sm text-neutral-600">
                Taken another job, or changed your mind? Tell them so they can stop holding a place for you.
              </p>
              <button
                type="submit"
                className="mt-2 rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-semibold text-neutral-700 transition hover:border-red-300 hover:text-red-600"
              >
                Pull out of this one
              </button>
            </form>
          ) : (
            <form action={reapplyApplication} className="mt-4 border-t border-neutral-100 pt-4">
              <input type="hidden" name="applicationId" value={application.id} />
              <button
                type="submit"
                className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Actually, I am still interested
              </button>
            </form>
          )}
        </div>

        {application.cover_message && (
          <div className={`mt-4 ${card}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              What you wrote when you applied
            </p>
            <p className="mt-1 whitespace-pre-line text-sm text-neutral-800">{application.cover_message}</p>
          </div>
        )}

        <div className={`mt-4 ${card}`}>
          <p className="text-sm font-bold text-neutral-900">Messages</p>
          <MessageThread
            messages={thread}
            myRole="candidate"
            otherName={application.employer_name}
            action={sendCandidateMessage}
            applicationId={application.id}
            maxLength={MESSAGE_MAX}
            emptyText={`Nothing yet. ${application.employer_name} can message you here, and you can reply. Everything stays on KatisoBiz Jobs so you both have a record.`}
            placeholder="Ask a question, or answer what they asked."
          />
        </div>

        {application.vacancy_id && (
          <Link
            href={vacancyHref}
            className="mt-4 inline-block text-sm font-semibold text-neutral-600 underline underline-offset-2 hover:text-neutral-900"
          >
            See the job advert again
          </Link>
        )}

        <p className="mt-6 text-xs text-neutral-500">
          No real employer asks you to pay for training, a uniform, transport or an admin fee. If anyone
          here does, report it from the job advert.
        </p>
      </section>
      <JobsFooter />
    </main>
  );
}
