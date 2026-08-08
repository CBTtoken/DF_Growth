import { loadOwnedCvData } from "@/lib/jobs/pdf/render-cv";
import { buildCvDocx } from "@/lib/jobs/word/cv-docx";

// The Word twin of ../pdf/route.tsx: same ownership gate, same assembly, a
// .docx download the person can keep editing in Word or Google Docs.
//
// ?aimed=<id> renders a named, aimed version instead of the base CV. Same
// ownership gate either way, because loadOwnedCvData checks the candidate
// and the overlay is scoped to it.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const aimed = new URL(request.url).searchParams.get("aimed");
  const loaded = await loadOwnedCvData(id, aimed);
  if (!loaded) return new Response("Not found", { status: 404 });

  const buffer = await buildCvDocx(loaded.assembly, loaded.templateId);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${loaded.filenameBase}.docx"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
