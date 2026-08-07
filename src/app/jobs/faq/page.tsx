import type { Metadata } from "next";
import Link from "next/link";
import { JobsFooter } from "@/components/jobs/JobsFooter";
import { JobsQuestionForm } from "@/components/jobs/JobsQuestionForm";
import { jobsCanonical, jobsPath } from "@/lib/jobs/host";

export const metadata: Metadata = {
  title: { absolute: "Questions and answers | KatisoBiz Jobs" },
  description:
    "What KatisoBiz Jobs costs, who can see your CV, why we never ask for your ID number, and how to reach a real person. Building a CV and applying is always free.",
  alternates: { canonical: jobsCanonical("/faq") },
};

// The questions people actually ask, answered plainly, plus a way to ask
// one we have not thought of. Grouped rather than listed: seekers first,
// because most visitors are seekers, then employers, then the safety
// answers that matter most to somebody who has been scammed before.
//
// Every answer here is true of the build as it stands. Nothing aspirational,
// nothing about features that do not exist yet.

type Qa = { q: string; a: React.ReactNode };

const SEEKER_QA: Qa[] = [
  {
    q: "What does it cost me?",
    a: "Nothing, ever. Building your CV, downloading it as a PDF or a Word file, being found by employers, and applying for jobs are all free for job seekers. There is no paid version for you and there never will be. Employers pay to post jobs, and that is what pays for this.",
  },
  {
    q: "Do I need an account?",
    a: "Not to build a CV or download it. You only need one if you want to come back to it later, be found by employers, or apply for a job here. Signing up takes an email address, a password and a code we email you.",
  },
  {
    q: "I already have a CV. Do I have to type it all in again?",
    a: (
      <>
        No. Upload it as a PDF or a Word file and we read it into your profile for you. You check what we
        found, fix anything wrong, answer one question about the kind of work you do, and you are finished.
        The file itself is thrown away immediately and never stored.
      </>
    ),
  },
  {
    q: "Who can see my CV?",
    a: "Your name, your number, where you have worked and what you wrote about yourself show only to a registered employer who is logged in, and every one of those views is recorded. Anyone browsing without an account sees the kind of work you do, how long you have done it, your skills, your area and your job titles with dates, and nothing that identifies you. You can switch off being found at any time from your dashboard, and you can delete your CV for good.",
  },
  {
    q: "How do I apply for a job?",
    a: "Open the job and tap Apply with my CV. Your CV goes to that employer, and you can add a short note saying why the job suits you. You can see what happened to every application on your dashboard: Sent, Being reviewed, Shortlisted, or Not successful this time.",
  },
  {
    q: "Can I talk to the employer?",
    a: "Yes, once you have applied. Open that application from your dashboard and you can message them, and they can message you. Both of you get an email when a message arrives. Everything stays on KatisoBiz Jobs so you both have a record of what was said, which protects you as much as it protects them.",
  },
  {
    q: "I got another job. Can I pull out?",
    a: "Yes. Open that application from your dashboard and tap Pull out of this one. The employer sees that you withdrew rather than being left wondering, and you can change your mind again afterwards. It does not affect any of your other applications.",
  },
  {
    q: "Can I change my details after I have finished?",
    a: "Yes. Your name, contact number and contact email are on your dashboard under My details. Everything else, including your work history, is editable section by section from your CV: open it and tap Edit next to the part you want to change.",
  },
];

const EMPLOYER_QA: Qa[] = [
  {
    q: "What does it cost to post a job?",
    a: (
      <>
        Your first post is free, once. After that it is R45 a month for five posts a month, or R69 a month
        for unlimited posts. If you already pay for DigitalFlyer Growth or a paid KatisoBiz membership,
        posting is included and unlimited, always. Sign up with the same email you use there and we pick it
        up automatically.
      </>
    ),
  },
  {
    q: "How long does a post stay up?",
    a: "Thirty days. You can renew it for another thirty in one tap, close it the moment the position is filled, and repost a closed job later without writing it again.",
  },
  {
    q: "How do I know when somebody applies?",
    a: "We email you the moment it happens, at whichever address you set on your dashboard, and the applicant appears under Applicants with their full CV, which you can read on screen or download as PDF or Word. The email carries their note but not the CV itself, because CVs stay behind your login where the view can be recorded.",
  },
  {
    q: "How do I contact an applicant?",
    a: "Open the applicant and message them. They get an email and can reply, and the whole thread stays on their application so you both have a record. Their phone number and email are on their CV too, but the thread is usually faster and it keeps everything in one place. Your own number is never shown on your advert: applicants come to you through the platform.",
  },
  {
    q: "Can I search for people instead of waiting for applications?",
    a: "Yes. Find people lists everyone who has switched on being found, filtered by the kind of work and the area. Full contact details need a registered employer account, and each view is recorded.",
  },
];

const SAFETY_QA: Qa[] = [
  {
    q: "Why do you never ask for my ID number?",
    a: "Because no real employer needs it before an interview, and asking for it is how most job scams start. We do not have a field for it anywhere. If you type one into a box by accident, we remove it before it is saved.",
  },
  {
    q: "Somebody is asking me to pay for training, a uniform or transport. Is that normal?",
    a: "No. Applying for a job never costs money, and a real employer does not ask you to pay anything before you start. Any post that asks a candidate to pay is held for a person to check before it can go live. If one gets past us, use Report this job on the advert and we will look at it.",
  },
  {
    q: "Can I delete everything?",
    a: "Yes, from your CV screen, and it is immediate. Your name, contact details and everything you typed are removed, and you stop appearing to employers at once.",
  },
];

function QaList({ title, items }: { title: string; items: Qa[] }) {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-extrabold uppercase tracking-wide text-neutral-500">{title}</h2>
      <div className="mt-3 flex flex-col gap-3">
        {items.map((item) => (
          <details
            key={item.q}
            className="rounded-2xl border border-neutral-100 bg-white shadow-sm"
          >
            <summary className="cursor-pointer list-none px-4 py-4 text-base font-bold text-neutral-ink">
              {item.q}
            </summary>
            <div className="border-t border-neutral-100 px-4 py-4 text-sm leading-relaxed text-neutral-700">
              {item.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

export default async function JobsFaqPage() {
  const [howItWorksHref, cvHref, employersHref] = await Promise.all([
    jobsPath("/how-it-works"),
    jobsPath("/cv"),
    jobsPath("/employers"),
  ]);

  return (
    <main className="flex flex-1 flex-col bg-neutral-50">
      <section className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-ink">Questions and answers</h1>
        <p className="mt-2 text-base text-neutral-600">
          If your question is not here, ask it at the bottom of this page. A real person reads every one.
        </p>
        <p className="mt-3 text-sm text-neutral-500">
          New here?{" "}
          <Link href={howItWorksHref} className="font-semibold text-neutral-900 underline underline-offset-2">
            How KatisoBiz Jobs works
          </Link>{" "}
          walks through it step by step.
        </p>

        <QaList title="Looking for work" items={SEEKER_QA} />
        <QaList title="Hiring" items={EMPLOYER_QA} />
        <QaList title="Staying safe" items={SAFETY_QA} />

        <section className="mt-12 rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-extrabold text-neutral-ink">Ask us anything</h2>
          <p className="mt-1 text-sm text-neutral-600">
            A question we have not answered, something that did not work, or an idea for what we should
            build next. We are new and we would rather hear it than guess.
          </p>
          <div className="mt-5">
            <JobsQuestionForm />
          </div>
        </section>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href={cvHref}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-hover"
          >
            Build my free CV
          </Link>
          <Link
            href={employersHref}
            className="inline-flex flex-1 items-center justify-center rounded-full border border-neutral-300 px-6 py-3.5 text-sm font-semibold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-900"
          >
            I have a job to fill
          </Link>
        </div>
      </section>
      <JobsFooter />
    </main>
  );
}
