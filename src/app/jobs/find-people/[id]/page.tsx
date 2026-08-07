import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AVAILABILITY_OPTIONS, type WorkHistoryEntry } from "@/lib/jobs/cv-conversation";
import { JobsFooter } from "@/components/jobs/JobsFooter";
import { ReportCandidateForm } from "@/components/jobs/ReportCandidateForm";
import { jobsCanonical, jobsPath } from "@/lib/jobs/host";

// Only the columns the anonymous layer is allowed to show, named
// explicitly -- never full_name, phone, email or photo_path, and never a
// bare select("*") that would need updating by hand every time this stays
// safe by accident rather than by construction.
const PUBLIC_COLUMNS =
  "id, years_experience, suburb, province, availability, skills, work_history, summary, listed, deleted_at, jobs_taxonomy!jobs_candidates_primary_role_id_fkey(label)";

async function getListing(id: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("jobs_candidates").select(PUBLIC_COLUMNS).eq("id", id).maybeSingle();
  if (!data || !data.listed || data.deleted_at) return null;
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return { title: { absolute: "Not found | KatisoBiz Jobs" } };

  const roleLabel = (listing.jobs_taxonomy as unknown as { label: string } | null)?.label ?? "Available for work";
  const title = `${roleLabel}${listing.years_experience != null ? `, ${listing.years_experience} years' experience` : ""}${listing.suburb ? `, ${listing.suburb}` : ""}`;

  return {
    title: { absolute: `${title} | KatisoBiz Jobs` },
    description: `${title}. Log in as an employer on KatisoBiz Jobs to see the full profile and get in touch.`,
    alternates: { canonical: jobsCanonical(`/find-people/${id}`) },
  };
}

export default async function CandidateListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return notFound();

  const roleLabel = (listing.jobs_taxonomy as unknown as { label: string } | null)?.label ?? "Available for work";
  const availabilityLabel = AVAILABILITY_OPTIONS.find((a) => a.id === listing.availability)?.label;
  const skillSlugs: string[] = listing.skills ?? [];
  const admin = createAdminClient();
  const backHref = await jobsPath("/find-people");
  const { data: skillRows } = skillSlugs.length
    ? await admin.from("jobs_taxonomy").select("slug, label").in("slug", skillSlugs)
    : { data: [] };
  const workHistory = (listing.work_history ?? []) as WorkHistoryEntry[];

  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Link href={backHref} className="text-sm font-medium text-neutral-500 hover:text-neutral-900">
          &larr; Back to search
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-neutral-900">
          {roleLabel}
          {listing.years_experience != null ? `, ${listing.years_experience} years' experience` : ""}
        </h1>
        <p className="mt-1 text-neutral-600">
          {[listing.suburb, listing.province].filter(Boolean).join(", ")}
          {availabilityLabel ? ` · Available: ${availabilityLabel}` : ""}
        </p>

        {listing.summary && <p className="mt-6 text-neutral-800">{listing.summary}</p>}

        {(skillRows ?? []).length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Skills</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(skillRows ?? []).map((s) => (
                <span key={s.slug} className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-700">
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {workHistory.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Work history</p>
            <ul className="mt-2 flex flex-col gap-3">
              {workHistory.map((w, i) => (
                <li key={i}>
                  <p className="font-semibold text-neutral-900">
                    {w.role} &middot; {w.employer}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {w.start} to {w.current ? "present" : w.end}
                  </p>
                  {w.description && <p className="mt-1 text-sm text-neutral-700">{w.description}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-10 rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-sm text-neutral-600">
          Full contact details are only shown to logged-in employers, and every view is recorded against the
          employer account that made it.
        </div>

        <div className="mt-4">
          <ReportCandidateForm candidateId={id} />
        </div>
      </section>
      <JobsFooter />
    </main>
  );
}
