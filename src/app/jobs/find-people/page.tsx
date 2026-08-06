import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AVAILABILITY_OPTIONS } from "@/lib/jobs/cv-conversation";
import { JobsFooter } from "@/components/jobs/JobsFooter";
import { jobsCanonical, jobsPath } from "@/lib/jobs/host";

export const metadata: Metadata = {
  title: { absolute: "Find people looking for work | KatisoBiz Jobs" },
  alternates: { canonical: jobsCanonical("/find-people") },
};

// The anonymous browse layer, the spec's Google-indexable layer. A Server
// Component reading through the admin client with an explicit column list
// (role, suburb, years, availability -- never name, phone, email or
// photo_path): the HTML this renders is the entire anonymous-access
// surface for this table, and there is no client-side query against
// jobs_candidates anywhere in this codebase for that same reason.
export default async function FindPeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; area?: string }>;
}) {
  const { role, area } = await searchParams;
  const admin = createAdminClient();

  const [{ data: taxonomy }, listingsRes] = await Promise.all([
    admin.from("jobs_taxonomy").select("id, slug, label").order("sort_order"),
    (async () => {
      let query = admin
        .from("jobs_candidates")
        .select(
          "id, primary_role_id, years_experience, suburb, province, availability, jobs_taxonomy!jobs_candidates_primary_role_id_fkey(label)",
        )
        .eq("listed", true)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(60);
      if (role) query = query.eq("primary_role_id", role);
      if (area) query = query.ilike("suburb", `%${area}%`);
      return query;
    })(),
  ]);

  if (listingsRes.error) {
    // Found live: a bare jobs_taxonomy(label) embed is ambiguous (two FKs
    // point at it, primary_role_id and alert_role_id) and PostgREST fails
    // the query -- which this page previously swallowed into an empty
    // list rather than a visible error, reading as "nobody has listed
    // themselves" instead of "the query is broken". Logged now so that
    // never happens silently again.
    console.error("Failed to load jobs_candidates listings", listingsRes.error);
  }
  const listings = listingsRes.data ?? [];
  const findPeoplePrefix = await jobsPath("/find-people");

  return (
    <main className="flex flex-1 flex-col">
      <section className="border-b border-neutral-100 bg-neutral-50 px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-bold text-neutral-900">Find people looking for work</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Real people, real skills. No name or contact details until you&apos;re a logged-in employer.
          </p>

          <form className="mt-6 flex flex-col gap-3 sm:flex-row" method="get">
            <select
              name="role"
              defaultValue={role ?? ""}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900"
            >
              <option value="">Any type of work</option>
              {(taxonomy ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <input
              type="text"
              name="area"
              defaultValue={area ?? ""}
              placeholder="Suburb or town"
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        {listings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-500">
            {role || area
              ? "Nobody matching that search yet. Try a wider search."
              : "Nobody has listed themselves yet. Be the first."}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {listings.map((c) => {
              const roleLabel = (c.jobs_taxonomy as unknown as { label: string } | null)?.label;
              const availabilityLabel = AVAILABILITY_OPTIONS.find((a) => a.id === c.availability)?.label;
              return (
                <li key={c.id}>
                  <Link
                    href={`${findPeoplePrefix}/${c.id}`}
                    className="flex flex-col gap-1 rounded-xl border border-neutral-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <span className="font-semibold text-neutral-900">
                      {roleLabel ?? "Available for work"}
                      {c.years_experience != null ? `, ${c.years_experience} years` : ""}
                    </span>
                    <span className="text-sm text-neutral-500">
                      {[c.suburb, c.province].filter(Boolean).join(", ")}
                      {availabilityLabel ? ` · ${availabilityLabel}` : ""}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <JobsFooter />
    </main>
  );
}
