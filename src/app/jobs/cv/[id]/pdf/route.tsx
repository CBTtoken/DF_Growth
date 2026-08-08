import { renderCvPdf } from "@/lib/jobs/pdf/render-cv";

// @react-pdf/renderer needs Node, not the edge runtime.
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // ?aimed=<id> renders a named, aimed version instead of the base CV.
  const aimed = new URL(request.url).searchParams.get("aimed");
  return renderCvPdf(id, aimed);
}
