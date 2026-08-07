import { loadOwnedCvData } from "@/lib/jobs/pdf/render-cv";
import { buildCvDocx } from "@/lib/jobs/word/cv-docx";

// The Word twin of ../pdf/route.tsx: same ownership gate, same data, a
// .docx download the person can keep editing in Word or Google Docs.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadOwnedCvData(id);
  if (!loaded) return new Response("Not found", { status: 404 });

  const buffer = await buildCvDocx(loaded.data);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${loaded.filenameBase}.docx"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
