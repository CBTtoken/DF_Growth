import Link from "next/link";
import { jobsPath } from "@/lib/jobs/host";

// KatisoBiz Jobs landing page, built to the same rules the KatisoBiz
// landing settled (src/components/bizup/landing/BizUpLanding.tsx):
//
//   - Mobile first, genuinely. 360px is the design target.
//   - One action everywhere for the primary audience: build the CV.
//     Employers get one clearly separated section with their own action.
//   - No testimonials, no invented numbers, no "trusted by". There are no
//     users yet and inventing them is a misleading representation.
//   - No images and no JavaScript: the hero CV is drawn in CSS, the
//     expanders are <details>/<summary>. On a mid-range Android on
//     prepaid data that is the difference between working and not.
//   - Specificity is the proof. With no social proof, naming exactly what
//     the product does (and what it never does) is the persuasion.

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-neutral-900 lg:text-3xl">
      {children}
    </h2>
  );
}

const PROBLEMS = [
  {
    title: "The CV from the internet cafe",
    body: "Typed years ago in Word, saved on a memory stick you no longer have, and every update costs another trip and another R20. Your CV should live on your own phone, where you can fix it tonight.",
  },
  {
    title: "The one that looks homemade",
    body: "You can do the work. But next to a CV with clean sections and proper spelling, yours gets put down first, and nobody tells you why. The format is doing the talking before you get to.",
  },
  {
    title: "The R150 registration fee",
    body: "A job that asks for money before you start is not a job, it is the most common scam in the country. But when you need work, it is hard to walk away. You should never have to guess.",
  },
  {
    title: "Applying into silence",
    body: "You send your CV into a WhatsApp group or an email address and hear nothing back, ever. You do not even know if a person saw it. Being findable beats shouting into the dark.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Answer questions by tapping",
    body: "What work you do, how long you have done it, where you are. Tap the answers, one question at a time. No forms, no uploads, and if you stop halfway it saves your place.",
  },
  {
    n: "2",
    title: "Get a CV that looks professional",
    body: "Choose one of three clean layouts and download it as a PDF, free, yours to keep. We even check your spelling and wording for you, without changing what you actually said.",
  },
  {
    n: "3",
    title: "Let employers find you",
    body: "If you want, list yourself. Employers searching your area see your skills and experience, never your name or number, until a registered employer looks properly, and every look is recorded.",
  },
];

const FEATURES = [
  {
    title: "Your name and number stay protected",
    lead: "Anonymous until a real employer looks.",
    body: "The public page says \"electrician, eight years, Boksburg, available now\". Your name, phone number and email only show to registered employers, and every single view is recorded against the account that looked.",
  },
  {
    title: "We never ask for your ID number",
    lead: "And no real employer needs it before an interview.",
    body: "No ID numbers, no bank details, ever. If you type one in by accident we remove it automatically. Anyone who demands your ID or banking details before an interview is showing you exactly what they are.",
  },
  {
    title: "A wording check, built in",
    lead: "Spelling and grammar, fixed in one tap.",
    body: "Not confident writing in English? One tap checks your spelling and tightens your wording without changing what you said, and gives you a short list of ways to make your CV stronger. It never invents anything.",
  },
  {
    title: "Three looks, one tap apart",
    lead: "Clean, Bold or Compact.",
    body: "The same CV in three professional layouts. Pick the one that suits you, download the PDF, and change your mind any time. It prints properly on any printer.",
  },
  {
    title: "Real jobs, near you",
    lead: "From businesses with names and numbers.",
    body: "Every vacancy shows which business posted it, where the work is, and how to apply. Posts that ask candidates for any kind of payment are stopped before you ever see them.",
  },
  {
    title: "Delete everything, any time",
    lead: "Your CV belongs to you.",
    body: "One tap removes your name, your contact details and everything you typed, permanently. We do not keep a copy, and you stop appearing to employers immediately.",
  },
];

const SAFETY = [
  "We never ask for your ID number or bank details, and we remove them automatically if they are typed in.",
  "No employer may ask you to pay for anything. Not training, not a uniform, not transport, not an admin fee. Posts that try are held before they go public.",
  "Your name and contact details never appear on a page that anyone on the internet can see.",
  "Every time a registered employer views your full details, that view is recorded against their account. Bulk collection ends an employer's account.",
  "There is a report button on every job and every listing. Reports go to a person, not a robot.",
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "How much does it cost?",
    a: "Nothing, for job seekers, ever. Building your CV is free, downloading it is free, listing yourself is free, applying for jobs is free. There is no paid version of any of it for you. Employers pay to post jobs, which is what keeps it free for you.",
  },
  {
    q: "Do I need to upload my old CV?",
    a: "No, and you cannot, on purpose. You answer questions by tapping and typing, and if you have an old CV you can copy from it as you go. What you get back is better structured than what you started with.",
  },
  {
    q: "Will you ask for my ID number?",
    a: "Never. No real employer needs your ID number before an interview, and asking for it up front is the most common way job scams start in South Africa. We also never ask for bank details, and we strip both out automatically if they get typed into a CV.",
  },
  {
    q: "Is my phone number public?",
    a: "No. The public can see your skills, your experience, your suburb and when you can start. Your name, number and email only show to employers who have registered, and every view they make is recorded against their account.",
  },
  {
    q: "What phone do I need?",
    a: "Any phone with a browser. There is nothing to download, no app store, no updates, and the pages are built to work on prepaid data.",
  },
  {
    q: "A job asked me to pay a fee. Is that normal?",
    a: "No. It is the advance-fee scam, the most common job scam in the country. A real employer never asks you to pay for training, a uniform, transport or admin before you start. Do not pay, and report the post with the button on the page, a person will look at it.",
  },
  {
    q: "Can I change or delete my CV later?",
    a: "Yes, any time. Log back in and every answer can be changed. Deleting removes your name, contact details and everything you typed permanently, and you disappear from employer searches immediately.",
  },
  {
    q: "I want to hire someone. What does it cost?",
    a: "Your first job post is free. After that it is R45 a month for 5 posts a month, or R69 a month for unlimited posts. Paying Growth and KatisoBiz members post free and unlimited, always, included in their membership.",
  },
];

/** The hero CV, drawn in CSS. The document is the product. */
function HeroCv() {
  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
      <p className="text-lg font-extrabold text-neutral-900">Thabo M.</p>
      <p className="text-sm text-neutral-600">Electrician · 8 years&apos; experience</p>
      <p className="mt-0.5 text-xs text-neutral-400">Boksburg, Gauteng · Available now</p>
      <div className="mt-4 border-t border-neutral-100 pt-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">Skills</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {["Electrician", "Solar installer", "Aircon"].map((s) => (
            <span key={s} className="rounded bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-700">
              {s}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 border-t border-neutral-100 pt-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">Work history</p>
        <div className="mt-1.5 flex items-baseline justify-between">
          <p className="text-xs font-semibold text-neutral-800">Electrician · Volt Works</p>
          <p className="text-[10px] text-neutral-400">2019 to present</p>
        </div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-500">
          Residential wiring, fault finding, and certificates of compliance across the East Rand.
        </p>
      </div>
      <p className="mt-4 border-t border-neutral-100 pt-2 text-center text-[9px] text-neutral-300">
        Built with KatisoBiz Jobs
      </p>
    </div>
  );
}

export async function JobsLanding() {
  const [cvHref, vacanciesHref, employersHref, loginHref] = await Promise.all([
    jobsPath("/cv"),
    jobsPath("/vacancies"),
    jobsPath("/employers"),
    jobsPath("/login"),
  ]);

  return (
    <main className="flex flex-1 flex-col bg-white">
      {/* ============ 1. HERO ============ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-neutral-100 via-white to-white pt-12 pb-12 lg:pt-20 lg:pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-bold text-neutral-700">
                KatisoBiz Jobs, from DigitalFlyer SA
              </span>

              <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-neutral-900 sm:text-5xl xl:text-6xl">
                A CV that gets you taken seriously.
              </h1>

              <p className="mt-4 text-base leading-relaxed text-neutral-600 lg:text-lg">
                Built on your phone in a few minutes, by tapping answers. Download it free, keep it
                forever, and if you want, let employers in your area find you. We never ask for your
                ID number.
              </p>

              <div className="mt-7 flex flex-row flex-wrap items-center gap-3">
                <Link
                  href={cvHref}
                  className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-7 py-3.5 text-base font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800"
                >
                  Build my CV free
                </Link>
                <Link
                  href={vacanciesHref}
                  className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-6 py-3.5 text-sm font-semibold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-900"
                >
                  Browse jobs near you
                </Link>
              </div>

              <p className="mt-5 text-sm text-neutral-400">
                Free forever for job seekers · No ID number, ever · Works on any phone · Built in South
                Africa
              </p>
            </div>

            {/* The CV is the hero, not the software. */}
            <div className="order-first lg:order-last">
              <HeroCv />
            </div>
          </div>
        </div>
      </section>

      {/* ============ 2. THE PROBLEM ============ */}
      <section className="border-y border-neutral-100 bg-neutral-50 py-12 lg:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading>Sound familiar?</SectionHeading>
          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PROBLEMS.map((p) => (
              <div key={p.title} className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-neutral-900">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 3. HOW IT WORKS ============ */}
      <section id="how-it-works" className="scroll-mt-16 bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading>Three steps. That is the whole thing.</SectionHeading>
          <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-neutral-900 text-base font-bold text-white">
                  {s.n}
                </span>
                <h3 className="mt-4 font-bold text-neutral-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-7">
            <Link
              href={cvHref}
              className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-7 py-3.5 text-base font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800"
            >
              Start my CV now
            </Link>
          </div>
        </div>
      </section>

      {/* ============ 4. WHAT YOU GET ============ */}
      <section className="border-t border-neutral-100 bg-neutral-50 py-12 lg:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading>What you actually get</SectionHeading>

          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FEATURES.slice(0, 4).map((f) => (
              <div key={f.title} className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-neutral-900">{f.title}</h3>
                <p className="mt-2 text-sm font-semibold text-neutral-900">{f.lead}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">{f.body}</p>
              </div>
            ))}
          </div>

          <details className="group mt-4">
            <summary className="inline-flex cursor-pointer list-none items-center justify-center rounded-full border border-neutral-300 px-5 py-3 text-sm font-semibold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-900">
              <span className="group-open:hidden">See everything it does</span>
              <span className="hidden group-open:inline">Show less</span>
            </summary>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {FEATURES.slice(4).map((f) => (
                <div key={f.title} className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
                  <h3 className="font-bold text-neutral-900">{f.title}</h3>
                  <p className="mt-2 text-sm font-semibold text-neutral-900">{f.lead}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">{f.body}</p>
                </div>
              ))}
            </div>
          </details>
        </div>
      </section>

      {/* ============ 5. SAFETY STRIP ============
          Jobs' equivalent of KatisoBiz's compliance strip: specificity as
          proof. Job seekers are the most scam-targeted group in the
          country, and naming exactly what we never do is the persuasion. */}
      <section className="bg-neutral-900 py-12 text-white lg:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-extrabold leading-tight tracking-tight lg:text-3xl">
            Built to keep you safe from job scams
          </h2>
          <ul className="mt-7 flex flex-col gap-3">
            {SAFETY.map((s) => (
              <li key={s} className="flex gap-3 text-sm leading-relaxed text-white/85">
                <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-white" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
          <p className="mt-7 border-t border-white/15 pt-5 text-xs leading-relaxed text-white/60">
            If something feels wrong about a job, trust that feeling. Report it with the button on the
            page and a person will look at it.
          </p>
        </div>
      </section>

      {/* ============ 6. EMPLOYERS ============ */}
      <section className="bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading>Hiring? Your first post is free.</SectionHeading>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600">
            Real candidates with real CVs, in your area, and a job post that takes a few minutes. Full
            candidate details show only to registered employers, and every view is recorded, which is a
            protection for the people listed here, not a paywall.
          </p>
          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-5">
              <p className="font-bold text-neutral-900">First post free</p>
              <p className="mt-1 text-sm text-neutral-600">Every new employer&apos;s first vacancy costs nothing. 30 days, renewable.</p>
            </div>
            <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-5">
              <p className="font-bold text-neutral-900">R45 a month</p>
              <p className="mt-1 text-sm text-neutral-600">5 posts a month, for businesses hiring regularly.</p>
            </div>
            <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-5">
              <p className="font-bold text-neutral-900">R69 a month</p>
              <p className="mt-1 text-sm text-neutral-600">Unlimited posts, for recruiters and agencies.</p>
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold text-neutral-900">
            Paying Growth and KatisoBiz members post free and unlimited, always.
          </p>
          <div className="mt-6">
            <Link
              href={employersHref}
              className="inline-flex items-center justify-center rounded-full border border-neutral-900 px-6 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
            >
              Post a job
            </Link>
          </div>
        </div>
      </section>

      {/* ============ 7. FAQ ============ */}
      <section id="faq" className="scroll-mt-16 border-t border-neutral-100 bg-neutral-50 py-12 lg:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionHeading>Questions people actually ask</SectionHeading>
          <div className="mt-7 flex flex-col gap-3">
            {FAQ.map((item) => (
              <details key={item.q} className="group rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
                <summary className="cursor-pointer list-none font-bold text-neutral-900">
                  {item.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-neutral-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 8. FINAL CTA ============ */}
      <section className="bg-neutral-900 py-14 text-center text-white lg:py-20">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight">
            Your CV, done properly, in the next ten minutes.
          </h2>
          <p className="mt-3 text-sm text-white/70">
            Free, on the phone in your hand, and yours to keep.
          </p>
          <div className="mt-7">
            <Link
              href={cvHref}
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-base font-semibold text-neutral-900 shadow-sm transition hover:-translate-y-0.5"
            >
              Build my CV free
            </Link>
          </div>
          <p className="mt-5 text-sm">
            <Link href={loginHref} className="text-white/60 underline-offset-2 hover:text-white hover:underline">
              Already registered? Log in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
