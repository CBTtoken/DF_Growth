import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { describeReactivationStatus } from "@/lib/growth-client/reactivation-status-label";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { VerifyAddressesButton } from "@/components/admin/VerifyAddressesButton";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const STATUS_STYLES: Record<string, string> = {
  Built: "bg-gray-100 text-gray-600",
  "Invitation sent": "bg-amber-100 text-amber-700",
  "Trial active": "bg-green-100 text-green-700",
  "Trial expired": "bg-red-50 text-red-700",
  "Converted to paying": "bg-brand/10 text-brand",
};

// Legacy Reactivation Sprint 1, Section 6. Scoped to signup_channel =
// 'legacy_reactivation' only — the general /admin list stays the
// all-clients view, this is specifically for tracking the 31-business
// batch through its own lifecycle (built -> invitation sent -> trial
// active/expired -> converted). Email delivery status shows a static
// placeholder because the sending mechanism (Section 9: subdomain,
// verification, bounce/complaint webhooks, suppression list) is Sprint 2
// scope and doesn't exist yet — matches Section 7's own instruction to
// build the mechanism with placeholder content until real copy is approved.
export default async function ReactivationBatchPage() {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) forbidden();

  const admin = createAdminClient();
  const { data: clients } = await admin
    .from("growth_clients")
    .select(
      "id, business_name, contact_email, industry, city, trial_starts_at, trial_ends_at, paystack_reference, created_at, slug, email_verification_status, email_unsubscribed_at, email_bounced_at, email_complained_at"
    )
    .eq("signup_channel", "legacy_reactivation")
    .order("business_name", { ascending: true });

  const rows = clients ?? [];
  const counts = rows.reduce<Record<string, number>>((acc, c) => {
    const label = describeReactivationStatus(c);
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className="min-h-full bg-gray-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <BrandHeader />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Link href="/admin" className="text-xs font-semibold text-gray-400 hover:text-gray-600">
              ← All clients
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-ink">Reactivation Batch</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <VerifyAddressesButton />
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file-download route, not a page */}
            <a
              href="/api/admin/reactivation-export"
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:-translate-y-0.5 hover:border-gray-300"
            >
              Export as CSV ↓
            </a>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {Object.entries(counts).map(([label, count]) => (
            <span
              key={label}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[label] ?? "bg-gray-100 text-gray-600"}`}
            >
              {label}: {count}
            </span>
          ))}
        </div>

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight text-ink">Businesses ({rows.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-4">Business</th>
                  <th className="py-2 pr-4">Industry</th>
                  <th className="py-2 pr-4">City</th>
                  <th className="py-2 pr-4">Account status</th>
                  <th className="py-2 pr-4">Trial started</th>
                  <th className="py-2 pr-4">Email status</th>
                  <th className="py-2 pr-4" />
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const statusLabel = describeReactivationStatus(c);
                  const emailStatus = c.email_unsubscribed_at
                    ? "Unsubscribed"
                    : c.email_bounced_at
                      ? "Bounced"
                      : c.email_complained_at
                        ? "Complained"
                        : c.email_verification_status === "valid"
                          ? "Verified"
                          : c.email_verification_status === "invalid"
                            ? "Invalid address"
                            : "Not yet checked";
                  const emailStatusStyle =
                    c.email_unsubscribed_at || c.email_bounced_at || c.email_complained_at || c.email_verification_status === "invalid"
                      ? "bg-red-50 text-red-700"
                      : c.email_verification_status === "valid"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500";
                  return (
                    <tr key={c.id} className="border-b border-gray-50">
                      <td className="py-2.5 pr-4 font-medium text-gray-900">{c.business_name}</td>
                      <td className="py-2.5 pr-4 text-gray-500">{c.industry ?? "—"}</td>
                      <td className="py-2.5 pr-4 text-gray-500">{c.city ?? "—"}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[statusLabel] ?? "bg-gray-100 text-gray-600"}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-400">
                        {c.trial_starts_at ? new Date(c.trial_starts_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${emailStatusStyle}`}>{emailStatus}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        <Link href={`/admin/clients/${c.id}`} className="text-xs font-semibold text-brand hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
