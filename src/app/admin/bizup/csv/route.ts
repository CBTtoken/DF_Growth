import { requireAdminEmail } from "@/lib/auth/require-admin";
import { loadBizUpAdminMetrics } from "@/lib/bizup/admin-metrics";
import { toCsv, csvAmount, csvResponse } from "@/lib/bizup/csv";

// The member list as a spreadsheet, for when Dewald wants to sort or filter
// it rather than read it. Same allowlist gate as the page, and a real 403
// rather than a 200 that would confirm the route exists.
export async function GET() {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) {
    return new Response("Forbidden", { status: 403 });
  }

  const m = await loadBizUpAdminMetrics();

  const rows = m.members_list.map((r) => [
    r.businessName,
    r.email,
    r.plan,
    r.planSource,
    r.isVatVendor ? "yes" : "no",
    r.createdAt,
    r.documentsThisMonth,
    r.documentsTotal,
    r.lastDocumentAt ?? "",
  ]);

  // The headline figures go on the end rather than the front, so the member
  // rows start at line 2 and the file opens straight into a sortable table.
  rows.push(
    ["", "", "", "", "", "", "", "", ""],
    ["Members", String(m.members.total), "", "", "", "", "", "", ""],
    ["Activated", String(m.activation.activated), "", "", "", "", "", "", ""],
    ["Never sent anything", String(m.activation.neverSent), "", "", "", "", "", "", ""],
    ["Monthly recurring", csvAmount(m.revenue.mrrCents), "", "", "", "", "", "", ""],
    [
      "Collected this month",
      csvAmount(m.revenue.collectedThisMonthCents),
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
  );

  const csv = toCsv(
    [
      "Business",
      "Email",
      "Plan",
      "Plan source",
      "VAT vendor",
      "Joined",
      "Documents this month",
      "Documents total",
      "Last document",
    ],
    rows,
  );

  const today = new Date().toISOString().slice(0, 10);
  return csvResponse(`katisobiz-members-${today}.csv`, csv);
}
