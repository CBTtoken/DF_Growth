import type { Metadata } from "next";
import { JobsLanding } from "@/components/jobs/JobsLanding";
import { JobsFooter } from "@/components/jobs/JobsFooter";
import { jobsCanonical } from "@/lib/jobs/host";

// The layout sets a title template, and a template applies to routes below
// the layout, never to the page.tsx sitting beside it (same gotcha
// documented in src/app/moxie/page.tsx) -- without absolute this page's
// title cascades through the root layout's own template too.
export const metadata: Metadata = {
  title: { absolute: "Free CV builder and jobs near you | KatisoBiz Jobs" },
  description:
    "Build a professional CV on your phone in minutes, free, by tapping answers. Browse real jobs near you, and let employers find you. We never ask for your ID number.",
  alternates: { canonical: jobsCanonical("/") },
};

export default function JobsHomePage() {
  return (
    <>
      <JobsLanding />
      <JobsFooter />
    </>
  );
}
