import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { JobsFooter } from "@/components/jobs/JobsFooter";
import { jobsCanonical, jobsPath } from "@/lib/jobs/host";

export const metadata: Metadata = {
  title: { absolute: "Jobs near you | KatisoBiz Jobs" },
  description: "Real vacancies from real businesses across South Africa. No agency runaround, no fees, ever.",
  alternates: { canonical: jobsCanonical("/vacancies") },
};

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
  temp: "Temporary",
};

// The public jobs board. Employers are fully visible -- business identity
// is business information (the spec's deliberate asymmetry with the
// anonymous candidate layer).
export default async function VacanciesPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; province?: string }>;
}) {
  const { role, province } = await searchParams;
  const admin = createAdminClient();

  const [{ data: taxonomy }, vacanciesRes] = await Promise.all([
    admin.from("jobs_taxonomy").select("id, slug, label").order("sort_order"),
    (async () => {
      let query = admin
        .from("jobs_vacancies")
        .select(
          "id, title, suburb, province, employment_type, pay_text, created_at, jobs_taxonomy!jobs_vacancies_role_id_fkey(label), jobs_employers!inner(business_name)",
        )
        .eq("status", "published")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(60);
      if (role) query = query.eq("role_id", role);
      if (province) query = query.eq("province", province);
      return query;
    })(),
  ]);

  if (vacanciesRes.error) {
    console.error("Failed to load vacancies", vacanciesRes.error);
  }
  const vacancies = vacanciesRes.data ?? [];
  const vacancyPrefix = await jobsPath("/vacancies");
  const employersHref = await jobsPath("/employers");

  return (
    <main className="flex flex-1 flex-col">
      <section className="border-b border-neutral-100 bg-neutral-50 px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-bold text-neutral-900">Jobs near you</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Real vacancies from real businesses. Applying is always free, and no real employer asks you to
            pay for anything.
          </p>

          <form className="mt-6 flex flex-col gap-3 sm:flex-row" method="get">
            <select
              name="role"
              defaultValue={role ?? ""}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900"
            >
              <option value="">Any type of work</option>
              {(taxonomy ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              name="province"
              defaultValue={province ?? ""}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900"
            >
              <option value="">Any province</option>
              {["Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga", "Northern Cape", "North West", "Western Cape"].map(
                (p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ),
              )}
            </select>
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
        {vacancies.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-500">
            {role || province ? "No jobs matching that search right now. Try a wider search." : "No jobs posted yet. Check back soon."}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {vacancies.map((v) => {
              const roleLabel = (v.jobs_taxonomy as unknown as { label: string } | null)?.label;
              const employer = (v.jobs_employers as unknown as { business_name: string } | null)?.business_name;
              return (
                <li key={v.id}>
                  <Link
                    href={`${vacancyPrefix}/${v.id}`}
                    className="flex flex-col gap-1 rounded-xl border border-neutral-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <span className="font-semibold text-neutral-900">{v.title}</span>
                    <span className="text-sm text-neutral-500">
                      {[employer, roleLabel, EMPLOYMENT_TYPE_LABELS[v.employment_type]].filter(Boolean).join(" · ")}
                    </span>
                    <span className="text-sm text-neutral-500">
                      {v.suburb}, {v.province}
                      {v.pay_text ? ` · ${v.pay_text}` : ""}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-8 text-center text-sm text-neutral-500">
          Hiring?{" "}
          <Link href={employersHref} className="font-semibold text-neutral-900 hover:underline">
            Post a job, your first one is free
          </Link>
        </p>
      </section>
      <JobsFooter />
    </main>
  );
}
