import { getSvcAdmin } from "@/lib/svc/admin";
import { partnerReportData } from "@/lib/svc/payouts";
import { renderPartnerReportPdf } from "@/lib/svc/partner-report-pdf";

// @react-pdf/renderer needs Node, not the edge runtime.
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; period: string }> }
) {
  const admin = await getSvcAdmin();
  // 404 rather than 403 so the endpoint never confirms an id exists.
  if (!admin) return new Response("Not found", { status: 404 });

  const { id, period } = await params;
  if (!/^\d{4}-\d{2}-01$/.test(period)) return new Response("Not found", { status: 404 });

  const data = await partnerReportData(id, period);
  if (!data) return new Response("Not found", { status: 404 });

  const pdf = await renderPartnerReportPdf(data);
  const safeName = data.partnerName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="svc-partner-report-${safeName}-${period.slice(0, 7)}.pdf"`,
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
