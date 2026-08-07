import type { Metadata } from "next";
import Link from "next/link";
import { JobsFooter } from "@/components/jobs/JobsFooter";
import { JobsHeader } from "@/components/jobs/JobsHeader";
import { jobsCanonical, jobsPath } from "@/lib/jobs/host";

export const metadata: Metadata = {
  title: { absolute: "Hire staff | Post a job free | KatisoBiz Jobs" },
  description:
    "Post a job and find real candidates in your area. Your first post is free. Growth and paid KatisoBiz members post free, always.",
  alternates: { canonical: jobsCanonical("/employers") },
};

// The employer landing: what it costs, in plain words, and one primary
// action. The gate on full candidate records is stated as what it is, a
// protection control, not a paywall (spec wording).
export default async function EmployersLandingPage() {
  const [signupHref, browseHref] = await Promise.all([jobsPath("/employers/signup"), jobsPath("/find-people")]);

  return (
    <>
      <JobsHeader />
    <main className="flex flex-1 flex-col">
      <section className="flex flex-col items-center gap-6 px-6 py-16 text-center">
        <h1 className="max-w-md text-3xl font-bold tracking-tight text-neutral-900">
          Find someone who can actually do the job
        </h1>
        <p className="max-w-sm text-base text-neutral-600">
          Real candidates with real CVs, in your area. Post a vacancy in a few minutes, or browse the people
          already looking.
        </p>
        <Link
          href={signupHref}
          className="mt-2 inline-flex w-full max-w-xs items-center justify-center rounded-full bg-neutral-900 px-8 py-4 text-base font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800"
        >
          Post a job
        </Link>
        <Link href={browseHref} className="text-sm font-medium text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline">
          Browse people looking for work
        </Link>
      </section>

      <section className="mx-auto w-full max-w-md px-6 pb-12">
        <h2 className="text-center text-xs font-semibold uppercase tracking-wide text-neutral-400">What it costs</h2>
        <div className="mt-4 flex flex-col gap-3">
          <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
            <p className="font-bold text-neutral-900">Your first post: free</p>
            <p className="mt-1 text-sm text-neutral-600">
              Every new employer&apos;s first vacancy costs nothing. It runs for 30 days and you can renew it.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
            <p className="font-bold text-neutral-900">R45 a month: 5 posts a month</p>
            <p className="mt-1 text-sm text-neutral-600">For businesses hiring regularly.</p>
          </div>
          <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
            <p className="font-bold text-neutral-900">R69 a month: unlimited posts</p>
            <p className="mt-1 text-sm text-neutral-600">For recruiters and agencies.</p>
          </div>
          <div className="rounded-2xl border border-neutral-900 bg-neutral-900 p-5 text-white shadow-sm">
            <p className="font-bold">Growth and paid KatisoBiz members: free, unlimited, always</p>
            <p className="mt-1 text-sm text-neutral-300">
              Already a paying DigitalFlyer Growth or KatisoBiz member? Job posting is included with your
              membership. Sign up here with the same email you use there.
            </p>
          </div>
        </div>
        <p className="mt-6 text-center text-xs leading-relaxed text-neutral-400">
          Full candidate details only show to registered employers, and every view is recorded. That is a
          protection for the people listing themselves, not a paywall.
        </p>
      </section>
      <JobsFooter />
    </main>
    </>
  );
}
