import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/jobs/LoginForm";
import { JobsFooter } from "@/components/jobs/JobsFooter";
import { jobsCanonical, jobsPath } from "@/lib/jobs/host";

// Metadata must live in a Server Component; the interactive form (useActionState)
// is split out into LoginForm.tsx so this file doesn't need "use client" and
// lose the ability to export metadata, the same mistake this page had before
// it was caught by checking the actual rendered <title>.
export const metadata: Metadata = {
  title: { absolute: "Log in | KatisoBiz Jobs" },
  alternates: { canonical: jobsCanonical("/login") },
};

export default async function JobsLoginPage() {
  const [homeHref, signupHref] = await Promise.all([jobsPath("/"), jobsPath("/signup")]);
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-neutral-50 p-8 text-center">
      <Link href={homeHref} className="text-2xl font-bold tracking-tight text-neutral-900">
        KatisoBiz Jobs
      </Link>
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-neutral-100 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">Log in</h1>
        <p className="text-sm text-neutral-500">Enter the email and password you signed up with.</p>
        <LoginForm />
      </div>
      <p className="text-sm text-neutral-500">
        New here?{" "}
        <Link href={signupHref} className="font-semibold text-neutral-900 hover:underline">
          Save your CV
        </Link>
      </p>
      <JobsFooter />
    </main>
  );
}
