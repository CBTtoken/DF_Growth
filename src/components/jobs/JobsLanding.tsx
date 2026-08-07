import Link from "next/link";

// The pre-launch home page (handoff Job 9): far less text. One line of
// what this is, two clean sections with one button each, real live
// counters (zero shown as zero, never inflated), a running board of live
// jobs that hides itself when there are none, and three steps per side.
// Colour from the KatisoBiz family (Job 10): amber accent, ink headings,
// zero images, zero JavaScript -- the ticker is a CSS animation.

export type LandingVacancy = {
  id: string;
  title: string;
  suburb: string;
  province: string;
  employer: string;
};

export type JobsLandingData = {
  seekerCount: number;
  vacancyCount: number;
  liveVacancies: LandingVacancy[];
  hrefs: {
    cv: string;
    cvImport: string;
    vacancies: string;
    employers: string;
    login: string;
    vacancyPrefix: string;
    howItWorks: string;
    faq: string;
  };
};

const SEEKER_STEPS = [
  { n: "1", text: "Answer a few questions, or upload the CV you already have." },
  { n: "2", text: "Download it free as PDF or Word, made professional." },
  { n: "3", text: "Apply with one tap, and let employers find you." },
];

const EMPLOYER_STEPS = [
  { n: "1", text: "Say what work it is and what you need. Your first post is free." },
  { n: "2", text: "Check the advert exactly as applicants will see it, then publish." },
  { n: "3", text: "Applications and matching CVs arrive on your dashboard." },
];

export function JobsLanding({ data }: { data: JobsLandingData }) {
  const { seekerCount, vacancyCount, liveVacancies, hrefs } = data;

  return (
    <div className="bg-white">
      {/* One line of what this is. */}
      <section className="px-4 pb-6 pt-10 text-center sm:px-6">
        <h1 className="mx-auto max-w-xl text-3xl font-extrabold leading-tight tracking-tight text-neutral-ink sm:text-4xl">
          Free CVs and real jobs, <span className="text-accent">near you</span>
        </h1>
      </section>

      {/* The two doors. */}
      <section className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 px-4 pb-8 sm:grid-cols-2 sm:px-6">
        <div className="flex flex-col rounded-2xl border border-neutral-100 bg-accent-light p-6">
          <h2 className="text-xl font-extrabold text-neutral-ink">I am looking for work</h2>
          <p className="mt-2 flex-1 text-sm text-neutral-700">
            Build a professional CV on your phone in minutes, free. Download it, apply with one tap, and be
            found. We never ask for your ID number, and nothing here ever costs you money.
          </p>
          <Link href={hrefs.cv} className="btn-accent-lg mt-4">
            Build my free CV
          </Link>
          <Link
            href={hrefs.cvImport}
            className="mt-2 text-center text-sm font-semibold text-neutral-700 underline-offset-2 hover:underline"
          >
            I already have a CV, upload it
          </Link>
        </div>

        <div className="flex flex-col rounded-2xl border border-neutral-100 bg-neutral-50 p-6">
          <h2 className="text-xl font-extrabold text-neutral-ink">I have a job to fill</h2>
          <p className="mt-2 flex-1 text-sm text-neutral-700">
            Post a structured advert and get applications with full CVs, or search the people already
            listed here. Your first post is free, and paying KatisoBiz and Growth members post free,
            always.
          </p>
          <Link href={hrefs.employers} className="btn-accent-lg mt-4">
            Post a job
          </Link>
          <Link
            href={hrefs.vacancies}
            className="mt-2 text-center text-sm font-semibold text-neutral-700 underline-offset-2 hover:underline"
          >
            See the jobs board
          </Link>
        </div>
      </section>

      {/* Real numbers, even when they are zero. */}
      <section className="border-y border-neutral-100 bg-white px-4 py-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-center gap-10 text-center">
          <div>
            <p className="text-3xl font-extrabold text-neutral-ink">{seekerCount}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {seekerCount === 1 ? "person" : "people"} looking for work
            </p>
          </div>
          <div className="h-10 w-px bg-neutral-200" />
          <div>
            <p className="text-3xl font-extrabold text-neutral-ink">{vacancyCount}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {vacancyCount === 1 ? "job" : "jobs"} available now
            </p>
          </div>
        </div>

        {/* We are new, said plainly. Dewald: "we are new, should we add
            something about that because it is all empty once we go
            public." Two real numbers next to each other with nothing
            explaining them reads as a failed product rather than a new
            one, and the numbers are never inflated to fix that
            (INTERFACE-STANDARD.md: never invent data in an interface). So
            the numbers stay honest and the sentence does the work. */}
        <p className="mx-auto mt-5 max-w-xl text-center text-sm leading-relaxed text-neutral-600">
          <span className="font-semibold text-neutral-ink">We have just opened.</span> The board fills up as
          employers post, and it is worth building your CV now: it is free, it is yours to download either
          way, and you are already listed when the right job arrives.
        </p>
      </section>

      {/* The running board: only when there is something real to run. */}
      {liveVacancies.length > 0 && (
        <section className="overflow-hidden border-b border-neutral-100 bg-neutral-ink px-0 py-3">
          <style>{`
            @keyframes jobs-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
            .jobs-ticker-track { animation: jobs-ticker ${Math.max(liveVacancies.length * 6, 18)}s linear infinite; }
            @media (prefers-reduced-motion: reduce) { .jobs-ticker-track { animation: none; } }
          `}</style>
          <div className="jobs-ticker-track flex w-max items-center gap-8">
            {[...liveVacancies, ...liveVacancies].map((v, i) => (
              <Link
                key={`${v.id}-${i}`}
                href={`${hrefs.vacancyPrefix}/${v.id}`}
                className="whitespace-nowrap text-sm text-white/90 hover:text-white"
              >
                <span className="font-semibold text-accent">{v.title}</span>{" "}
                <span className="text-white/60">
                  {v.employer} · {v.suburb}, {v.province}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Three steps per side. */}
      <section className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6">
        <div>
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-neutral-500">
            Looking for work
          </h3>
          <ol className="mt-3 flex flex-col gap-3">
            {SEEKER_STEPS.map((s) => (
              <li key={s.n} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                  {s.n}
                </span>
                <span className="text-sm text-neutral-700">{s.text}</span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-neutral-500">Hiring</h3>
          <ol className="mt-3 flex flex-col gap-3">
            {EMPLOYER_STEPS.map((s) => (
              <li key={s.n} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-ink text-xs font-bold text-white">
                  {s.n}
                </span>
                <span className="text-sm text-neutral-700">{s.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Two ways to find out more before committing to anything. Both
          pages are public and indexed; this is the internal link that
          gets them crawled. */}
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-4 pb-10 sm:flex-row sm:px-6">
        <Link
          href={hrefs.howItWorks}
          className="flex-1 rounded-2xl border border-neutral-100 bg-white p-4 transition hover:border-neutral-300"
        >
          <p className="font-bold text-neutral-ink">How it works</p>
          <p className="mt-1 text-sm text-neutral-600">
            Every step, for job seekers and for employers, before you start.
          </p>
        </Link>
        <Link
          href={hrefs.faq}
          className="flex-1 rounded-2xl border border-neutral-100 bg-white p-4 transition hover:border-neutral-300"
        >
          <p className="font-bold text-neutral-ink">Questions and answers</p>
          <p className="mt-1 text-sm text-neutral-600">
            What it costs, who sees your CV, and a place to ask us anything.
          </p>
        </Link>
      </section>

      {/* One safety line, because it is the promise the whole product makes. */}
      <section className="bg-accent-light px-4 py-5 text-center sm:px-6">
        <p className="mx-auto max-w-xl text-sm font-semibold text-neutral-ink">
          Applying never costs money, and we never ask for your ID number or bank details. Any post that
          asks a candidate to pay is held before it ever goes live.
        </p>
      </section>

      {/* Who is behind this. Dewald's ask: say that Jobs is part of the
          KatisoBiz range and that DigitalFlyer SA owns and runs it, with
          the tagline and a way through to both. It earns its place at
          launch: a brand-new jobs site asking for a phone number has to
          answer "who are you" somewhere on the first screen, and a real
          registered company behind it is the answer. */}
      <section className="border-t border-neutral-100 bg-neutral-ink px-4 py-10 text-center sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
          Part of the KatisoBiz range
        </p>
        <p className="mx-auto mt-3 max-w-lg text-2xl font-extrabold leading-tight text-white">
          Get found. Get the job. <span className="text-accent">Get paid.</span>
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/70">
          KatisoBiz Jobs is built and run by DigitalFlyer SA. KatisoBiz is where a South African business
          gets a page customers can find, sends quotes and invoices, and keeps its paperwork straight.
          Jobs is the part that helps you get hired, and helps those businesses hire.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="https://katisobiz.co.za"
            className="inline-flex w-full max-w-xs items-center justify-center rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
          >
            See KatisoBiz
          </a>
          <a
            href="https://digitalflyer.co.za"
            className="inline-flex w-full max-w-xs items-center justify-center rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
          >
            See DigitalFlyer SA
          </a>
        </div>
      </section>
    </div>
  );
}
