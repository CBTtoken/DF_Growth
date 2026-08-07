import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyJobsEmployer } from "@/lib/jobs/employer";
import { renewVacancy, removeMyVacancy } from "@/app/jobs/employer/actions";
import { vacancyIsExpired, vacancyNearingExpiry } from "@/lib/jobs/entitlements";
import { JobsFooter } from "@/components/jobs/JobsFooter";
import { jobsPath } from "@/lib/jobs/host";

export const metadata: Metadata = {
  title: { absolute: "My jobs | KatisoBiz Jobs" },
  robots: { index: false, follow: false },
};

// Renew appears inside this window before expiry, same 7-day rule as the
// Board dashboard.
const RENEW_WINDOW_DAYS = 7;

export default async function EmployerDashboardPage() {
  const employer = await getMyJobsEmployer();
  if (!employer) redirect(await jobsPath("/employers"));

  const admin = createAdminClient();
  const { data: vacancies } = await admin
    .from("jobs_vacancies")
    .select("id, title, suburb, province, status, held_reason, expires_at, created_at")
    .eq("employer_id", employer.id)
    .neq("status", "removed")
    .order("created_at", { ascending: false });

  const [postHref, upgradeHref, browseHref] = await Promise.all([
    jobsPath("/employer/post"),
    jobsPath("/employer/upgrade"),
    jobsPath("/find-people"),
  ]);

  const e = employer.entitlement;

  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-bold text-neutral-900">{employer.businessName}</h1>
        <p className="mt-1 text-sm text-neutral-500">{e.label}</p>

        {e.lapsed && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Your subscription has ended. Your live posts stay up for two weeks from when it ended, then they
            come down.{" "}
            <Link href={upgradeHref} className="font-semibold underline underline-offset-2">
              Restart your plan
            </Link>{" "}
            to keep posting.
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {e.canPostNow ? (
            <Link
              href={postHref}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-neutral-900 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800"
            >
              Post a job
            </Link>
          ) : (
            <Link
              href={upgradeHref}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-neutral-900 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800"
            >
              {e.lapsed ? "Restart my plan" : "Get more posts"}
            </Link>
          )}
          <Link
            href={browseHref}
            className="inline-flex flex-1 items-center justify-center rounded-full border border-neutral-200 px-6 py-3.5 text-sm font-semibold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-900"
          >
            Browse candidates
          </Link>
        </div>

        <h2 className="mt-10 text-sm font-bold text-neutral-900">Your posts</h2>
        {(vacancies ?? []).length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-500">
            Nothing posted yet. Your vacancies will appear here, with their expiry dates and a renew button.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {(vacancies ?? []).map((v) => {
              const expired = vacancyIsExpired(v.expires_at);
              const nearingExpiry = vacancyNearingExpiry(v.expires_at, RENEW_WINDOW_DAYS);
              return (
                <li key={v.id} className="flex flex-col gap-2 rounded-xl border border-neutral-100 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold text-neutral-900">{v.title}</p>
                    <span className="text-xs text-neutral-400">
                      {v.suburb}, {v.province}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {v.status === "held"
                      ? "Being reviewed before it goes live"
                      : expired
                        ? "Expired"
                        : `Live until ${new Date(v.expires_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}`}
                    {nearingExpiry && v.status === "published" ? " · expiring soon" : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(expired || nearingExpiry) && v.status !== "held" && (
                      <form action={renewVacancy.bind(null, v.id)}>
                        <button
                          type="submit"
                          className="rounded-full border border-neutral-900 px-4 py-2 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-50"
                        >
                          Renew for 30 days
                        </button>
                      </form>
                    )}
                    <form action={removeMyVacancy.bind(null, v.id)}>
                      <button
                        type="submit"
                        className="rounded-full border border-neutral-200 px-4 py-2 text-xs font-medium text-neutral-500 transition hover:border-red-300 hover:text-red-600"
                      >
                        Position filled, take it down
                      </button>
                    </form>
                  </div>
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
