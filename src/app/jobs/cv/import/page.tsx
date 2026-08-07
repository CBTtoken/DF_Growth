import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { CvImport } from "@/components/jobs/CvImport";
import { JobsFooter } from "@/components/jobs/JobsFooter";
import { jobsCanonical, jobsPath } from "@/lib/jobs/host";

export const metadata: Metadata = {
  title: { absolute: "Upload your CV | KatisoBiz Jobs" },
  description:
    "Already have a CV? Upload it as PDF or Word and we turn it into your KatisoBiz Jobs profile. The file itself is never stored.",
  robots: { index: false, follow: false },
  alternates: { canonical: jobsCanonical("/cv/import") },
};

export default async function CvImportPage() {
  // Same gate as the builder: a CV belongs to a person, not to a browser.
  // Uploading is the path most likely to be used by somebody who already
  // has an account, so sending them through signup first is also what
  // stops a second account being made by accident.
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(await jobsPath("/signup"));

  const cvHref = await jobsPath("/cv");

  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto w-full max-w-md flex-1 px-6 py-10">
        <Link href={cvHref} className="text-sm font-medium text-neutral-500 hover:text-neutral-900">
          &larr; Rather answer the questions
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-neutral-900">Upload your CV</h1>
        <p className="mt-1 text-sm text-neutral-500">
          PDF or Word. We read it into your profile, you check every field, and the file is thrown away.
        </p>
        <div className="mt-6">
          <CvImport />
        </div>
      </section>
      <JobsFooter />
    </main>
  );
}
