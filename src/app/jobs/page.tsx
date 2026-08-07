import type { Metadata } from "next";
import Link from "next/link";
import { JobsFooter } from "@/components/jobs/JobsFooter";
import { jobsCanonical, jobsPath } from "@/lib/jobs/host";

// The layout sets a title template, and a template applies to routes below
// the layout, never to the page.tsx sitting beside it (same gotcha
// documented in src/app/moxie/page.tsx) -- without absolute this page's
// title cascades through the root layout's own template too, rendering
// "KatisoBiz Jobs | ... | DigitalFlyer Growth".
export const metadata: Metadata = {
  title: { absolute: "KatisoBiz Jobs | Build a free CV and get found by real employers" },
  alternates: { canonical: jobsCanonical("/") },
};

// Sprint 1 home. One primary action per INTERFACE-STANDARD.md: build a CV.
// Nothing about employers or vacancies exists yet (Sprint 2), so there is
// deliberately no second call to action competing for the same thumb.
export default async function JobsHomePage() {
  const cvHref = await jobsPath("/cv");
  return (
    <main className="flex flex-1 flex-col">
      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <h1 className="max-w-md text-3xl font-bold tracking-tight text-neutral-900">
          Build a real CV, free, on your phone
        </h1>
        <p className="max-w-sm text-base text-neutral-600">
          A few minutes of questions, tap to answer. No forms, no file uploads. Download it whether or not you
          want employers to find you.
        </p>
        <Link
          href={cvHref}
          className="mt-2 inline-flex w-full max-w-xs items-center justify-center rounded-full bg-neutral-900 px-8 py-4 text-base font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800"
        >
          Build my CV
        </Link>
        <p className="text-xs text-neutral-400">We never ask for your ID number or bank details.</p>
      </section>
      <JobsFooter />
    </main>
  );
}
