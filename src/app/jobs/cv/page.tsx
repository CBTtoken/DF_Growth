import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveCandidateRow } from "@/app/jobs/cv/actions";
import { CvBuilder } from "@/components/jobs/CvBuilder";
import { jobsCanonical } from "@/lib/jobs/host";

export const metadata: Metadata = {
  title: { absolute: "Build your CV | KatisoBiz Jobs" },
  // Never indexed: this is a personal, mid-progress form, not a page with
  // content of its own to rank.
  robots: { index: false, follow: false },
  alternates: { canonical: jobsCanonical("/cv") },
};

export default async function CvBuilderPage() {
  const [candidate, { data: taxonomy }] = await Promise.all([
    resolveCandidateRow(),
    createAdminClient().from("jobs_taxonomy").select("id, slug, label, category").order("sort_order"),
  ]);

  return <CvBuilder initialCandidate={candidate} taxonomy={taxonomy ?? []} />;
}
