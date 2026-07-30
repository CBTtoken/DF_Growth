import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  buildRetentionReport,
  GROWTH_RETENTION_MONTHS,
  KATISOBIZ_RETENTION_YEARS,
  PUBLIC_IDENTITY_INACTIVITY_MONTHS,
} from "@/lib/retention/policy";
import { runGrowthRetention, runIdentityRetention } from "@/app/admin/retention/actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// What the retention policy is, what it would delete today, and the record
// of every time it ran.
//
// Written to be read by Dewald rather than by a developer, because the
// person who has to defend this under POPIA is him. It says the numbers in
// words, shows the names it would remove before removing them, and never
// deletes anything without a press.
export default async function AdminRetentionPage() {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) forbidden();

  const [report, { data: runs }] = await Promise.all([
    buildRetentionReport(),
    createAdminClient()
      .from("retention_runs")
      .select("id, ran_at, mode, actor, summary")
      .order("ran_at", { ascending: false })
      .limit(20),
  ]);

  const oldestKatiso = report.protectedKatisoBiz.oldestIssuedAt
    ? new Date(report.protectedKatisoBiz.oldestIssuedAt).toLocaleDateString("en-ZA")
    : "nothing issued yet";

  return (
    <main className="min-h-full bg-gray-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <BrandHeader />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm font-semibold text-gray-500 hover:text-gray-700">
              ← Admin
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-ink">Data retention</h1>
          </div>
          <StatusPill>
            {report.growthClients.length + report.publicIdentities.length} due
          </StatusPill>
        </div>

        <section className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-ink">The policy</h2>
          <ul className="flex flex-col gap-1.5 text-sm text-gray-600">
            <li>
              <span className="font-semibold text-ink">Growth members:</span> deleted{" "}
              {GROWTH_RETENTION_MONTHS} months after the account ends. This is what the published privacy
              policy already says.
            </li>
            <li>
              <span className="font-semibold text-ink">KatisoBiz:</span> kept for{" "}
              {KATISOBIZ_RETENTION_YEARS} years. Financial records, and nothing here can delete one.
            </li>
            <li>
              <span className="font-semibold text-ink">People who commented on the board:</span> the
              email they verified is deleted after {PUBLIC_IDENTITY_INACTIVITY_MONTHS} months with no
              activity.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-emerald-900">
            <ShieldCheck size={16} /> KatisoBiz, protected
          </h2>
          <p className="text-sm text-emerald-900">
            {report.protectedKatisoBiz.documents} documents across {report.protectedKatisoBiz.accounts}{" "}
            accounts. Oldest issued: {oldestKatiso}. Nothing on this page can touch any of it, and there
            is no code path in the system that deletes a KatisoBiz record on a timer.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-ink">
            Growth accounts past {GROWTH_RETENTION_MONTHS} months
          </h2>
          {report.growthClients.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              Nothing due.
            </p>
          ) : (
            <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <ul className="flex flex-col gap-1.5 text-sm">
                {report.growthClients.map((candidate) => (
                  <li key={candidate.id} className="flex flex-wrap justify-between gap-2">
                    <span className="font-semibold text-ink">{candidate.label}</span>
                    <span className="text-gray-500">{candidate.detail}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500">
                This deletes the business, its page, its photos and anything it posted to the board. It
                does not touch KatisoBiz.
              </p>
              <form action={runGrowthRetention}>
                <button
                  type="submit"
                  className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
                >
                  Delete these {report.growthClients.length}
                </button>
              </form>
            </div>
          )}
        </section>

        {report.growthClientsUnknownDate.length > 0 && (
          <section className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-sm font-bold text-amber-900">Cancelled, but we do not know when</h2>
            <p className="text-sm text-amber-900">
              These were cancelled before we started recording an end date, so the clock cannot be
              proved. They are never deleted automatically. If you want them gone, delete them from the
              client page itself, which is a decision with your name on it rather than a guess with
              mine.
            </p>
            <ul className="flex flex-col gap-1 text-sm text-amber-900">
              {report.growthClientsUnknownDate.map((candidate) => (
                <li key={candidate.id} className="flex flex-wrap justify-between gap-2">
                  <span className="font-semibold">{candidate.label}</span>
                  <span>{candidate.detail}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-ink">
            Board commenters, inactive {PUBLIC_IDENTITY_INACTIVITY_MONTHS} months
          </h2>
          {report.publicIdentities.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              Nothing due.
            </p>
          ) : (
            <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <ul className="flex flex-col gap-1.5 text-sm">
                {report.publicIdentities.map((candidate) => (
                  <li key={candidate.id} className="flex flex-wrap justify-between gap-2">
                    <span className="font-semibold text-ink">{candidate.label}</span>
                    <span className="text-gray-500">{candidate.detail}</span>
                  </li>
                ))}
              </ul>
              <form action={runIdentityRetention}>
                <button
                  type="submit"
                  className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
                >
                  Delete these {report.publicIdentities.length}
                </button>
              </form>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-ink">Every run</h2>
          <p className="text-xs text-gray-500">
            The evidence that the policy actually runs, which is the part POPIA cares about. The daily
            job only ever reports.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead className="border-b border-gray-100 text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">When</th>
                  <th className="px-3 py-2 font-semibold">Mode</th>
                  <th className="px-3 py-2 font-semibold">Who</th>
                  <th className="px-3 py-2 font-semibold">Result</th>
                </tr>
              </thead>
              <tbody>
                {(runs ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-gray-400">
                      Nothing yet.
                    </td>
                  </tr>
                ) : (
                  (runs ?? []).map((run) => (
                    <tr key={run.id} className="border-b border-gray-50 last:border-0">
                      <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                        {new Date(run.ran_at).toLocaleString("en-ZA", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-2 font-semibold text-ink">{run.mode}</td>
                      <td className="px-3 py-2 text-gray-500">{run.actor}</td>
                      <td className="px-3 py-2 text-gray-600">{JSON.stringify(run.summary)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
