import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { resolveCandidateRow } from "@/app/jobs/cv/actions";
import { CvBuilder } from "@/components/jobs/CvBuilder";
import { jobsCanonical, jobsPath } from "@/lib/jobs/host";
import { getLiveApplyIntent } from "@/lib/jobs/apply-intent";
import { getSeekerCredits } from "@/lib/jobs/credits";
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

  // An account comes first now. Dewald, 9 August 2026: "I think our flow is
  // wrong or it will confuse existing users, maybe we should change the
  // logic of someone building their free CV, they have to register first?"
  //
  // He is right, and it removes a whole class of problem rather than
  // patching them one at a time. The original spec made the CV anonymous
  // on purpose, to keep the first step frictionless, and the cost of that
  // decision turned up as five separate defects in two days: a CV built
  // logged out was stranded on login, a stale cookie handed the next
  // person on a shared phone somebody else's name and number, "Save my CV"
  // offered registration to people who already had an account, and the
  // reconciliation logic for all of it went wrong twice more.
  //
  // Every one of those exists because a CV could belong to a browser
  // rather than to a person. One identity from the first screen and none
  // of them can happen.
  //
  // The friction is smaller than it looks: the signup form asks for name
  // and mobile number, which are the first two questions of the CV anyway,
  // so what is genuinely added is an email address, a password and a typed
  // code. What is gained is that the CV is theirs from the first keystroke.
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(await jobsPath("/signup"));

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

  // The credit standing and the aimed copies, read here so the builder
  // never queries them itself. Both are cheap and both are needed the
  // moment the review screen renders.
  const credits = await getSeekerCredits(user.id);
  const { data: tailoredRows } = await createAdminClient()
    .from("jobs_cv_tailored")
    .select("id, name, created_at, summary")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <CvBuilder
      initialCandidate={candidate}
      initialOccupations={initialOccupations}
      fromImport={imported === "1"}
      applyIntent={applyIntent}
      creditBalance={credits.balance}
      freeWritesLeft={credits.freeWritesLeft}
      tailored={(tailoredRows ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        createdAt: t.created_at,
        summary: t.summary,
      }))}
    />
  );
}
