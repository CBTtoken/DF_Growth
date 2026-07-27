import { renderOwnedDocumentPdf } from "@/lib/bizup/pdf/render-owned";

// @react-pdf/renderer needs Node, not the edge runtime.
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return renderOwnedDocumentPdf(id);
}
