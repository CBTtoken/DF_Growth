import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AVAILABILITY_OPTIONS, type WorkHistoryEntry } from "@/lib/jobs/cv-conversation";
import { JobsFooter } from "@/components/jobs/JobsFooter";
import { ReportListingForm } from "@/components/jobs/ReportListingForm";
import { reportCandidate } from "@/app/jobs/find-people/actions";
import { jobsCanonical, jobsPath } from "@/lib/jobs/host";
import { getMyJobsEmployer } from "@/lib/jobs/employer";
import { isRateLimited } from "@/lib/rate-limit";
import { toggleSavedCandidate } from "@/app/jobs/employer/applicants/actions";

// Only the columns the anonymous layer is allowed to show, named
// explicitly -- never full_name, phone, email or photo_path, and never a
// bare select("*") that would need updating by hand every time this stays
// safe by accident rather than by construction.
//
// `summary` came off this list on 9 August 2026. Dewald: "all names and
// personal details are never publicly displayed or available, it remains
// behind the login wall." The summary is free text the person wrote about
// themselves, so it can carry their own name, their employer's, or their
// suburb down to the street, and no filter can reliably tell. It is shown
// to logged-in employers instead, where the view is recorded.
//
// `work_history` stays, because the public page still shows the roles and
// the years, which is the honest signal an employer searches on. The
// employer names and the descriptions inside it are stripped at render,
// not stored differently: see the note at the work history block below.
const PUBLIC_COLUMNS =
  "id, years_experience, suburb, province, availability, skills, work_history, listed, deleted_at, secondary_ofo_codes, experience_level, jobs_ofo_occupations(title)";

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

  const roleLabel = (listing.jobs_ofo_occupations as unknown as { title: string } | null)?.title ?? "Available for work";
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

  const roleLabel = (listing.jobs_ofo_occupations as unknown as { title: string } | null)?.title ?? "Available for work";
  const availabilityLabel = AVAILABILITY_OPTIONS.find((a) => a.id === listing.availability)?.label;
  const backHref = await jobsPath("/find-people");

  // The second and third positions, still nothing identifying: occupation
  // titles are exactly the kind of anonymous fact the browse layer exists
  // to show. Their official titles travel in the jsonb, no extra query.
  const alsoOpenTo = ((listing.secondary_ofo_codes ?? []) as { title: string }[]).map((s) => s.title);
  // Skills are stored as display labels since the OFO switch.
  const skillLabels: string[] = listing.skills ?? [];
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
        {alsoOpenTo.length > 0 && <p className="mt-1 text-sm text-neutral-500">Also open to: {alsoOpenTo.join(", ")}</p>}

        {skillLabels.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Skills</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {skillLabels.map((s) => (
                <span key={s} className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-700">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Roles and years only. The employer names and what they did
            there are deliberately not rendered here.

            A CV with no name on it is not anonymous if it says "Cashier at
            Shoprite Boksburg 2019 to 2021, then Supervisor at Boxer
            Brakpan": in a small town that is one person, and it is
            reachable by anybody, including somebody's current boss finding
            out they are looking. The roles and the years carry the signal
            an employer actually searches on, without the trail that
            identifies. The rest is one free registration away, where the
            view gets recorded against the account that made it. */}
        {workHistory.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Experience</p>
            <ul className="mt-2 flex flex-col gap-2">
              {workHistory.map((w, i) => (
                <li key={i} className="text-neutral-800">
                  <span className="font-semibold text-neutral-900">{w.role}</span>
                  <span className="text-sm text-neutral-500">
                    {" "}
                    &middot; {w.start} to {w.current ? "present" : w.end}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <FullRecordSection candidateId={id} />

        <div className="mt-4">
          <ReportListingForm targetId={id} action={reportCandidate} />
        </div>
      </section>
      <JobsFooter />
    </main>
  );
}

// The gate on full records, and why it exists, said on the page (spec:
// "The gate on full records exists as a protection control, not a
// paywall, and it should say so"). For a logged-in employer the full
// record renders server-side and the view is logged first -- every view,
// against the account that made it, which is the whole anti-scraping
// design: you will not stop the first scrape, you will see the account
// that pulled 400 records in an hour.
async function FullRecordSection({ candidateId }: { candidateId: string }) {
  const employer = await getMyJobsEmployer();
  const employersHref = await jobsPath("/employers");

  if (!employer) {
    return (
      <div className="mt-10 rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-sm text-neutral-600">
        Their name, contact details, where they have worked and what they say about themselves show only to
        registered employers, and every view is recorded against the employer account that made it. That
        protects the person listed here, it is not a paywall: registering as an employer is free.{" "}
        <Link href={employersHref} className="font-semibold text-neutral-900 underline underline-offset-2">
          Register free
        </Link>
      </div>
    );
  }

  // Per-account, not per-IP: IPs are free, accounts are not (spec). The
  // in-memory limiter resets on cold starts, so the durable control is
  // the view log the admin screen watches.
  if (isRateLimited(`jobs-views:${employer.id}`, 50, 60 * 60 * 1000)) {
    return (
      <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        You have viewed a lot of profiles in the last hour. Take a break and try again a bit later. Bulk
        collection of people&apos;s details ends an employer account.
      </div>
    );
  }

  const admin = createAdminClient();

  // The log comes first: a render that fails after the fetch must still
  // have been counted, never the other way round.
  await admin.from("jobs_record_views").insert({ employer_id: employer.id, candidate_id: candidateId });

  // summary and work_history come through here as well as the contact
  // details now: the public page shows roles and years only, so this is
  // the only place the employer names, the descriptions and the person's
  // own words are readable, and reaching it is logged.
  const [{ data: full }, { data: saved }] = await Promise.all([
    admin
      .from("jobs_candidates")
      .select("full_name, phone, email, summary, work_history")
      .eq("id", candidateId)
      .maybeSingle(),
    admin
      .from("jobs_saved_candidates")
      .select("id")
      .eq("employer_id", employer.id)
      .eq("candidate_id", candidateId)
      .maybeSingle(),
  ]);

  if (!full) return null;

  return (
    <div className="mt-10 rounded-xl border border-neutral-900 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        Contact details, shown to you as {employer.businessName}
      </p>
      <p className="mt-2 font-bold text-neutral-900">{full.full_name ?? "Name not given"}</p>
      {full.phone && (
        <a href={`tel:${full.phone.replace(/\s/g, "")}`} className="mt-1 block text-sm text-neutral-700 underline underline-offset-2">
          {full.phone}
        </a>
      )}
      {full.email && <p className="mt-1 text-sm text-neutral-700">{full.email}</p>}

      {full.summary && (
        <div className="mt-4 border-t border-neutral-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">In their words</p>
          <p className="mt-1 whitespace-pre-line text-sm text-neutral-800">{full.summary}</p>
        </div>
      )}

      {((full.work_history ?? []) as WorkHistoryEntry[]).length > 0 && (
        <div className="mt-4 border-t border-neutral-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Where they have worked
          </p>
          <ul className="mt-2 flex flex-col gap-3">
            {((full.work_history ?? []) as WorkHistoryEntry[]).map((w, i) => (
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

      <form action={toggleSavedCandidate} className="mt-4">
        <input type="hidden" name="candidateId" value={candidateId} />
        <button
          type="submit"
          className="rounded-full border border-neutral-200 px-4 py-2 text-xs font-medium text-neutral-600 hover:border-neutral-400"
        >
          {saved ? "Saved, tap to unsave" : "Save for later"}
        </button>
      </form>
      <p className="mt-3 text-xs text-neutral-400">
        This view has been recorded. Never ask a candidate to pay for anything.
      </p>
    </div>
  );
}
