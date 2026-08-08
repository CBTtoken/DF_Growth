import type { Metadata } from "next";
import Link from "next/link";
import { JobsFooter } from "@/components/jobs/JobsFooter";
import { jobsCanonical, jobsPath } from "@/lib/jobs/host";

export const metadata: Metadata = {
  title: { absolute: "How it works | KatisoBiz Jobs" },
  description:
    "Step by step: build a free CV on your phone or upload the one you have, download it, and apply for real jobs in one tap. For employers: post a job, preview it, and get applications with full CVs.",
  alternates: { canonical: jobsCanonical("/how-it-works") },
};

// The walkthrough page. The home page has two doors and three short steps
// each, which is right for a home page and not enough for somebody who
// wants to know what they are getting into before they start typing.
//
// Written as what happens, in order, with the honest detail attached to
// each step: what it costs, what we ask for, what we do not.

type Step = { n: string; title: string; body: string };

const SEEKER_STEPS: Step[] = [
  {
    n: "1",
    title: "Start your CV, or upload the one you have",
    body: "First a free account: your name, your mobile number, an email address and a password. The name and number are the first two questions of the CV anyway, and having an account is what makes the CV yours, so you can stop halfway and pick it up next week from any phone. Then you answer a few short questions, one per screen, and it saves as you go. If you already have a CV as a PDF or a Word file, upload it instead and we read it in for you.",
  },
  {
    n: "2",
    title: "Say what work you do",
    body: "You pick from the official South African occupation list, up to three kinds of work, and the first is your headline. This is the one thing we cannot read off a file, and it is what puts you in front of the right employers instead of all of them.",
  },
  {
    n: "3",
    title: "Check it and make it read well",
    body: "Every section is editable from the finished CV. If writing is not your strong point, we can draft it for you from the answers you gave, or check your spelling and wording. It only ever restates what you told us; it never invents a job you did not do.",
  },
  {
    n: "4",
    title: "Download it, free",
    body: "As a PDF or a Word file, in the look you choose, ready to print or email anywhere. This is yours whether or not you ever use anything else here.",
  },
  {
    n: "5",
    title: "Let employers find you",
    body: "Switch on being found and employers searching for someone like you can reach you. Anyone can see the kind of work you do, your skills, your area and your job titles. Your name, your number, where you have worked and what you wrote about yourself stay behind the login, shown only to registered employers, and every one of those views is recorded. Switch it off whenever you like.",
  },
  {
    n: "6",
    title: "Apply in one tap",
    body: "Open any job on the board and tap Apply with my CV. Add a short note if you want to say why it suits you. Your dashboard then shows what happened to each application: Sent, Being reviewed, Shortlisted, or Not successful this time.",
  },
];

const EMPLOYER_STEPS: Step[] = [
  {
    n: "1",
    title: "Make an employer account",
    body: "Your business name, an email and a number. If you already pay for DigitalFlyer Growth or a paid KatisoBiz membership, use the same email and job posting is included, unlimited, always.",
  },
  {
    n: "2",
    title: "Write the advert",
    body: "A structured form rather than one empty box: what the work is, the level, where it is, duties, what is non-negotiable, what is nice to have, qualifications, and how you will choose. Pay is optional and you decide whether it shows. If writing is not your job, we can tidy the wording for you.",
  },
  {
    n: "3",
    title: "See it exactly as an applicant will",
    body: "The preview is the real advert, not an approximation. Change anything, then publish for 30 days.",
  },
  {
    n: "4",
    title: "Get applications with full CVs",
    body: "We email you the moment somebody applies, and they appear on your dashboard with their full CV and their note. Mark each one Reviewing, Shortlisted or Declined, and save the ones worth keeping.",
  },
  {
    n: "5",
    title: "Or go and find people yourself",
    body: "Browse everyone who has switched on being found, by kind of work and area, without waiting for anybody to apply.",
  },
];

function StepList({ steps, accent }: { steps: Step[]; accent: boolean }) {
  return (
    <ol className="mt-4 flex flex-col gap-4">
      {steps.map((s) => (
        <li key={s.n} className="flex items-start gap-4">
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
              accent ? "bg-accent" : "bg-neutral-ink"
            }`}
          >
            {s.n}
          </span>
          <div className="min-w-0">
            <p className="font-bold text-neutral-ink">{s.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-neutral-700">{s.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default async function HowItWorksPage() {
  const [cvHref, importHref, employersHref, faqHref, vacanciesHref] = await Promise.all([
    jobsPath("/cv"),
    jobsPath("/cv/import"),
    jobsPath("/employers"),
    jobsPath("/faq"),
    jobsPath("/vacancies"),
  ]);

  return (
    <main className="flex flex-1 flex-col bg-white">
      <section className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-ink">
          How KatisoBiz Jobs works
        </h1>
        <p className="mt-2 text-base text-neutral-600">
          Free for anyone looking for work. Employers pay to post, and that is what pays for the rest.
        </p>

        <section className="mt-10 rounded-2xl border border-neutral-100 bg-accent-light p-5 sm:p-6">
          <h2 className="text-xl font-extrabold text-neutral-ink">If you are looking for work</h2>
          <StepList steps={SEEKER_STEPS} accent />
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href={cvHref}
              className="inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-3.5 text-base font-semibold text-white transition hover:bg-accent-hover"
            >
              Build my free CV
            </Link>
            <Link
              href={importHref}
              className="text-center text-sm font-semibold text-neutral-700 underline-offset-2 hover:underline"
            >
              I already have a CV, upload it
            </Link>
          </div>
        </section>

        {/* The longer version of the two promises the home page states in
            short (handoff Job 8). Both are already true of the product;
            neither was written down anywhere a person would find it. */}
        <section className="mt-8 rounded-2xl border border-neutral-100 bg-white p-5 sm:p-6">
          <h2 className="text-xl font-extrabold text-neutral-ink">We never make anything up</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-700">
            Every other CV tool sells you an AI that writes your CV. Ours does the opposite, on
            purpose. It does not invent a job, a date, a number, a qualification or a skill. It takes
            what you typed and puts it in the order and the words an employer expects to see.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-neutral-700">
            This is enforced in the software, not just asked for. If our AI produces a number you did
            not give us, the whole answer is thrown away and you are not charged for it. That is why we
            ask you what you can put a number to in each job: we cannot write that your team was six
            people unless you tell us it was six people.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-neutral-700">
            You read every line before it goes anywhere near your CV, and you can change any of it. The
            point is simple: nothing on your CV should be something you cannot explain in the
            interview.
          </p>

          <h2 className="mt-8 text-xl font-extrabold text-neutral-ink">Aim your CV at the job</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-700">
            The single most useful thing you can do with a CV is mirror the words used in the advert
            you are answering. Large employers and every recruitment agency run CVs through software
            before a person reads them, and that software is looking for the advert&apos;s own words.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-neutral-700">
            Pick a job from our board, or paste an advert from anywhere, and we rewrite your CV to lead
            with the experience that job is asking for, using your own facts. Your skills are reordered
            so the ones the advert wants come first. If the advert asks for something you have not
            done, we leave it out rather than claiming it. Each aimed CV saves under a name you choose,
            so you always know which one went where.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-neutral-700">
            Building your CV, downloading it, being found and applying are free, always. Two rewrites
            are free too. After that, R45 buys five CVs aimed at five different jobs, and they never
            expire.
          </p>
        </section>

        <section className="mt-8 rounded-2xl border border-neutral-100 bg-neutral-50 p-5 sm:p-6">
          <h2 className="text-xl font-extrabold text-neutral-ink">If you have a job to fill</h2>
          <StepList steps={EMPLOYER_STEPS} accent={false} />
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href={employersHref}
              className="inline-flex w-full items-center justify-center rounded-full bg-neutral-ink px-6 py-3.5 text-base font-semibold text-white transition hover:opacity-90"
            >
              Post a job
            </Link>
            <Link
              href={vacanciesHref}
              className="text-center text-sm font-semibold text-neutral-700 underline-offset-2 hover:underline"
            >
              See what is on the board
            </Link>
          </div>
        </section>

        <section className="mt-8 rounded-2xl bg-accent-light p-5 text-center sm:p-6">
          <p className="text-sm font-semibold text-neutral-ink">
            Applying never costs money, and we never ask for your ID number or bank details. Any post that
            asks a candidate to pay is held before it ever goes live.
          </p>
        </section>

        <p className="mt-8 text-center text-sm text-neutral-600">
          Still not sure about something?{" "}
          <Link href={faqHref} className="font-semibold text-neutral-900 underline underline-offset-2">
            Read the questions and answers
          </Link>{" "}
          or ask us there.
        </p>
      </section>
      <JobsFooter />
    </main>
  );
}
