import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveCandidateRow } from "@/app/jobs/cv/actions";
import { CvBuilder } from "@/components/jobs/CvBuilder";
import { jobsCanonical } from "@/lib/jobs/host";
import type { OccupationPick } from "@/lib/jobs/cv-conversation";

export const metadata: Metadata = {
  title: { absolute: "Build your CV | KatisoBiz Jobs" },
  // Never indexed: this is a personal, mid-progress form, not a page with
  // content of its own to rank.
  robots: { index: false, follow: false },
  alternates: { canonical: jobsCanonical("/cv") },
};

export default async function CvBuilderPage() {
  const candidate = await resolveCandidateRow();

  // The row stores only the primary occupation's code (the secondaries
  // carry their titles in jsonb); resolve the primary's official title here
  // so the builder can render every chip without a client-side lookup.
  let initialOccupations: OccupationPick[] = [];
  if (candidate) {
    const secondaries = candidate.secondary_ofo_codes ?? [];
    if (candidate.ofo_occupation_code) {
      const { data: primary } = await createAdminClient()
        .from("jobs_ofo_occupations")
        .select("code, title")
        .eq("code", candidate.ofo_occupation_code)
        .maybeSingle();
      initialOccupations = primary ? [primary, ...secondaries] : [...secondaries];
    } else {
      initialOccupations = [...secondaries];
    }
  }

  return <CvBuilder initialCandidate={candidate} initialOccupations={initialOccupations} />;
}
