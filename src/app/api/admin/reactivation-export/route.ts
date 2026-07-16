import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { describeReactivationStatus } from "@/lib/growth-client/reactivation-status-label";

// Legacy Reactivation Sprint 1, Section 6 — same csvField escaping as
// src/app/api/admin/export/route.ts, kept as a separate route rather than a
// query param on the general export because the column set is different
// (industry/city/trial timing, not the full onboarding-progress shape).
const COLUMNS = [
  "business_name",
  "slug",
  "contact_email",
  "industry",
  "city",
  "province",
  "call_phone",
  "status_label",
  "trial_starts_at",
  "trial_ends_at",
  "email_verification_status",
  "email_delivery_status",
  "created_at",
] as const;

function csvField(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function GET() {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: clients } = await admin
    .from("growth_clients")
    .select(
      "business_name, slug, contact_email, industry, city, province, call_phone, trial_starts_at, trial_ends_at, paystack_reference, created_at, email_verification_status, email_unsubscribed_at, email_bounced_at, email_complained_at"
    )
    .eq("signup_channel", "legacy_reactivation")
    .order("business_name", { ascending: true });

  if (!clients || clients.length === 0) {
    return NextResponse.json({ error: "No reactivation clients found" }, { status: 404 });
  }

  const rows = clients.map((c) => {
    const deliveryStatus = c.email_unsubscribed_at
      ? "Unsubscribed"
      : c.email_bounced_at
        ? "Bounced"
        : c.email_complained_at
          ? "Complained"
          : c.trial_starts_at
            ? "Sent"
            : "Not sent yet";
    const record: Record<string, unknown> = {
      ...c,
      status_label: describeReactivationStatus(c),
      email_delivery_status: deliveryStatus,
    };
    return COLUMNS.map((col) => csvField(record[col])).join(",");
  });

  const csv = [COLUMNS.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reactivation-batch-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
