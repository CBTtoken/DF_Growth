import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { JobsLanding, type LandingVacancy } from "@/components/jobs/JobsLanding";
import { JobsFooter } from "@/components/jobs/JobsFooter";
import { jobsCanonical, jobsPath } from "@/lib/jobs/host";

// The layout sets a title template, and a template applies to routes below
// the layout, never to the page.tsx sitting beside it (same gotcha
// documented in src/app/moxie/page.tsx) -- without absolute this page's
// title cascades through the root layout's own template too.
export const metadata: Metadata = {
  title: { absolute: "Free CV builder and jobs near you | KatisoBiz Jobs" },
  description:
    "Build a professional CV on your phone in minutes, free. Browse real jobs near you, apply with one tap, and let employers find you. We never ask for your ID number.",
  alternates: { canonical: jobsCanonical("/") },
};

// The counters are the page's honesty promise (real numbers, even zero),
// so the page renders per request rather than from a static shell.
export const dynamic = "force-dynamic";

export default async function JobsHomePage() {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const [seekerRes, vacancyRes, liveRes] = await Promise.all([
    admin
      .from("jobs_candidates")
      .select("id", { count: "exact", head: true })
      .eq("listed", true)
      .is("deleted_at", null),
    admin
      .from("jobs_vacancies")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .gt("expires_at", nowIso),
    admin
      .from("jobs_vacancies")
      .select("id, title, suburb, province, jobs_employers!inner(business_name)")
      .eq("status", "published")
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const liveVacancies: LandingVacancy[] = (liveRes.data ?? []).map((v) => ({
    id: v.id,
    title: v.title,
    suburb: v.suburb,
    province: v.province,
    employer: (v.jobs_employers as unknown as { business_name: string } | null)?.business_name ?? "",
  }));

  const [cv, cvImport, vacancies, employers, login, vacancyPrefix, howItWorks, faq] = await Promise.all([
    jobsPath("/cv"),
    jobsPath("/cv/import"),
    jobsPath("/vacancies"),
    jobsPath("/employers"),
    jobsPath("/login"),
    jobsPath("/vacancies"),
    jobsPath("/how-it-works"),
    jobsPath("/faq"),
  ]);

  return (
    <>
      <JobsLanding
        data={{
          seekerCount: seekerRes.count ?? 0,
          vacancyCount: vacancyRes.count ?? 0,
          liveVacancies,
          hrefs: { cv, cvImport, vacancies, employers, login, vacancyPrefix, howItWorks, faq },
        }}
      />
      <JobsFooter />
    </>
  );
}
