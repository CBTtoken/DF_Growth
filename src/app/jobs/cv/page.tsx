import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveCandidateRow } from "@/app/jobs/cv/actions";
import { CvBuilder } from "@/components/jobs/CvBuilder";
import { jobsCanonical } from "@/lib/jobs/host";
import { getLiveApplyIntent } from "@/lib/jobs/apply-intent";
import type { OccupationPick } from "@/lib/jobs/cv-conversation";

export const metadata: Metadata = {
  title: { absolute: "Build your CV | KatisoBiz Jobs" },
  // Never indexed: this is a personal, mid-progress form, not a page with
  // content of its own to rank.
  robots: { index: false, follow: false },
  alternates: { canonical: jobsCanonical("/cv") },
};

export default async function CvBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string }>;
}) {
  const { imported } = await searchParams;
  const candidate = await resolveCandidateRow();

  // Did they come here from a job advert? If so the finished CV should
  // offer the thing they actually came for, by name, rather than a
  // dashboard link. Looked up here rather than in the builder so the
  // client never has to know the vacancy exists.
  const intentId = await getLiveApplyIntent();
  let applyIntent: { id: string; title: string } | null = null;
  if (intentId) {
    const { data: vacancy } = await createAdminClient()
      .from("jobs_vacancies")
      .select("id, title, status")
      .eq("id", intentId)
      .eq("status", "published")
      .maybeSingle();
    if (vacancy) applyIntent = { id: vacancy.id, title: vacancy.title };
  }

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

  return (
    <CvBuilder
      initialCandidate={candidate}
      initialOccupations={initialOccupations}
      fromImport={imported === "1"}
      applyIntent={applyIntent}
    />
  );
}
