import type { Metadata } from "next";
import Link from "next/link";
import { EmployerSignupForm } from "@/components/jobs/EmployerSignupForm";
import { JobsFooter } from "@/components/jobs/JobsFooter";
import { jobsCanonical, jobsPath } from "@/lib/jobs/host";

export const metadata: Metadata = {
  title: { absolute: "Employer signup | KatisoBiz Jobs" },
  alternates: { canonical: jobsCanonical("/employers/signup") },
};

export default async function EmployerSignupPage() {
  const [homeHref, loginHref] = await Promise.all([jobsPath("/employers"), jobsPath("/login")]);
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-neutral-50 p-6 py-12 text-center">
      <Link href={homeHref} className="text-2xl font-bold tracking-tight text-neutral-900">
        KatisoBiz Jobs
      </Link>
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-neutral-100 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">Hire someone</h1>
        <p className="text-sm text-neutral-500">
          Your first post is free. Growth and paid KatisoBiz members post free, always.
        </p>
        <EmployerSignupForm />
      </div>
      <p className="text-sm text-neutral-500">
        Already have an account?{" "}
        <Link href={loginHref} className="font-semibold text-neutral-900 hover:underline">
          Log in
        </Link>
      </p>
      <JobsFooter />
    </main>
  );
}
