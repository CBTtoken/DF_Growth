import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/jobs/SignupForm";
import { JobsFooter } from "@/components/jobs/JobsFooter";
import { jobsCanonical, jobsPath } from "@/lib/jobs/host";

export const metadata: Metadata = {
  title: { absolute: "Start your free CV | KatisoBiz Jobs" },
  description:
    "Start your free CV on KatisoBiz Jobs. Your name and number are the first two questions either way, and the CV is yours from the first keystroke.",
  alternates: { canonical: jobsCanonical("/signup") },
};

// This is now the first screen of building a CV, not a save prompt at the
// end of one. It asks for name and mobile number, which are CV questions
// one and two anyway, plus the email and password that make the CV
// belong to a person rather than to a browser.
export default async function JobsSignupPage() {
  const [homeHref, loginHref] = await Promise.all([jobsPath("/"), jobsPath("/login")]);
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-neutral-50 p-6 py-12 text-center">
      <Link href={homeHref} className="text-2xl font-bold tracking-tight text-neutral-900">
        KatisoBiz Jobs
      </Link>

      {/* Said before the form, because a person deciding whether to hand
          over an email address deserves to know what they get for it. */}
      <p className="max-w-sm text-sm text-neutral-600">
        Free, and it stays free. We never ask for your ID number or bank details.
      </p>

      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-neutral-100 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">Start your free CV</h1>
        <p className="text-sm text-neutral-500">
          Your name and number are the first two questions of the CV anyway. This just makes it yours, so
          you can come back to it, download it again, and be found by employers.
        </p>
        <SignupForm />
      </div>
      <p className="text-sm text-neutral-500">
        Already started one?{" "}
        <Link href={loginHref} className="font-semibold text-neutral-900 hover:underline">
          Log in
        </Link>{" "}
        and it will be waiting.
      </p>
      <JobsFooter />
    </main>
  );
}
