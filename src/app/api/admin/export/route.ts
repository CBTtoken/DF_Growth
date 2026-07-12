import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { describeGrowthClientStatus } from "@/lib/growth-client/admin-status-label";

// Combined spec Sec 11. ?client=<id> exports just that one row, omitted
// exports every client — same underlying row shape either way, so Dewald
// can pull one client's full details for a Stoep Marketplace page, or the
// whole list for a broader review, from the same endpoint.
const COLUMNS = [
  "business_name",
  "slug",
  "plan",
  "billing_cycle",
  "status_label",
  "is_founding_member",
  "founding_signup_number",
  "contact_email",
  "contact_phone",
  "province",
  "industry",
  "business_address",
  "tagline",
  "business_description",
  "products_services",
  "additional_notes",
  "facebook_url",
  "instagram_url",
  "template",
  "meta_pixel_id",
  "meta_ad_account_id",
  "meta_setup_requested_help",
  "trial_ends_at",
  "consented_at",
  "created_at",
] as const;

// Escapes a value for a CSV field: wraps in quotes and doubles any internal
// quotes whenever the value contains a comma, quote, or newline — the
// minimum needed for a value to round-trip correctly through Excel/Sheets.
function csvField(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function GET(request: Request) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client");

  const admin = createAdminClient();
  let query = admin.from("growth_clients").select("*").order("created_at", { ascending: false });
  if (clientId) query = query.eq("id", clientId);

  const { data: clients } = await query;

  if (!clients || clients.length === 0) {
    return NextResponse.json({ error: "No matching clients" }, { status: 404 });
  }

  const clientIds = clients.map((c) => c.id);
  const { data: landingPages } = await admin
    .from("landing_pages")
    .select("growth_client_id, published")
    .in("growth_client_id", clientIds);
  const publishedByClient = new Map((landingPages ?? []).map((l) => [l.growth_client_id, l.published]));

  const rows = clients.map((c) => {
    const statusLabel = describeGrowthClientStatus({
      plan: c.plan,
      status: c.status,
      paystack_reference: c.paystack_reference,
      contact_email: c.contact_email,
      business_description: c.business_description,
      brand_primary_color: c.brand_primary_color,
      template: c.template,
      has_landing_page: publishedByClient.has(c.id),
      packages: c.packages,
      meta_pixel_id: c.meta_pixel_id,
      meta_setup_requested_help: c.meta_setup_requested_help,
    });
    const record: Record<string, unknown> = { ...c, status_label: statusLabel };
    return COLUMNS.map((col) => csvField(record[col])).join(",");
  });

  const csv = [COLUMNS.join(","), ...rows].join("\n");
  const filename =
    clientId && clients[0]?.slug ? `growth-client-${clients[0].slug}.csv` : `growth-clients-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
