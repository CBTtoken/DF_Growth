import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { describeReactivationStatus } from "@/lib/growth-client/reactivation-status-label";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { VerifyAddressesButton } from "@/components/admin/VerifyAddressesButton";
import { Card } from "@/components/ui/Card";
import { ExternalLinkButton } from "@/components/ui/Button";
import { StatusPill, type StatusPillTone } from "@/components/ui/StatusPill";
import { Table, TableHeadRow, Th, Tr, Td } from "@/components/ui/Table";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const STATUS_TONES: Record<string, StatusPillTone> = {
  Built: "neutral",
  "Invitation sent": "warning",
  "Trial active": "success",
  "Trial expired": "danger",
  "Converted to paying": "brand",
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
            <ExternalLinkButton href="/api/admin/reactivation-export" variant="secondary" lift>
              Export as CSV ↓
            </ExternalLinkButton>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {Object.entries(counts).map(([label, count]) => (
            <StatusPill key={label} tone={STATUS_TONES[label] ?? "neutral"} className="px-3 py-1">
              {label}: {count}
            </StatusPill>
          ))}
        </div>

        <Card className="flex flex-col gap-4">
          <h2 className="text-lg font-bold tracking-tight text-ink">Businesses ({rows.length})</h2>
          <Table minWidthClassName="min-w-[720px]">
            <TableHeadRow>
              <Th>Business</Th>
              <Th>Industry</Th>
              <Th>City</Th>
              <Th>Account status</Th>
              <Th>Trial started</Th>
              <Th>Email status</Th>
              <Th />
            </TableHeadRow>
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
                const emailStatusTone: StatusPillTone =
                  c.email_unsubscribed_at || c.email_bounced_at || c.email_complained_at || c.email_verification_status === "invalid"
                    ? "danger"
                    : c.email_verification_status === "valid"
                      ? "success"
                      : "neutral";
                return (
                  <Tr key={c.id}>
                    <Td className="font-medium text-gray-900">{c.business_name}</Td>
                    <Td className="text-gray-500">{c.industry ?? "—"}</Td>
                    <Td className="text-gray-500">{c.city ?? "—"}</Td>
                    <Td>
                      <StatusPill tone={STATUS_TONES[statusLabel] ?? "neutral"}>{statusLabel}</StatusPill>
                    </Td>
                    <Td className="text-gray-400">
                      {c.trial_starts_at ? new Date(c.trial_starts_at).toLocaleDateString() : "—"}
                    </Td>
                    <Td>
                      <StatusPill tone={emailStatusTone}>{emailStatus}</StatusPill>
                    </Td>
                    <Td className="text-right">
                      <Link href={`/admin/clients/${c.id}`} className="text-xs font-semibold text-brand hover:underline">
                        View
                      </Link>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      </div>
    </main>
  );
}
