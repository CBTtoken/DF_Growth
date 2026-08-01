import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublication } from "@/lib/emag/access";
import { assembleEdition } from "@/lib/emag/assemble";
import { MoxiePage } from "@/components/emag/Page";
import { PrintTrigger } from "@/components/emag/PrintTrigger";

// The PDF.
//
// This is the same HTML the reader gets, at A4, with a print stylesheet
// that makes each page its own sheet. The browser turns it into the file.
//
// That is a deliberate choice over generating a PDF separately. The ninth
// acceptance criterion is that the export matches the HTML edition, and the
// only way to guarantee that rather than test for it is for both to be the
// same thing. A second renderer drifts from the first the week after it is
// written, and the drift shows up in a reader's download rather than on any
// screen we look at.
//
// It also means the fonts are the ones already self-hosted here, the page
// breaks are the frozen ones, and nothing has to be kept in step.

export const metadata = { title: "Download", robots: { index: false } };

export default async function PrintEdition({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: found } = await supabase
    .from("emag_editions")
    .select("id, status, pdf_enabled")
    .eq("slug", slug)
    .maybeSingle();

  if (!found || found.status !== "published") notFound();

  // With the switch off there is no download route, not a download route
  // that refuses. The publish screen is honest that this is a convenience
  // rather than a lock, so there is no point pretending otherwise here.
  if (!found.pdf_enabled) notFound();

  const [edition, publication] = await Promise.all([assembleEdition(found.id), getPublication()]);
  if (!edition) notFound();

  const imprint = {
    site: publication?.site ?? "",
    credit: publication?.footer_credit ?? "",
  };

  return (
    <main className="mx mx-print">
      <PrintTrigger title={`${publication?.name ?? "Edition"}, ${edition.title}`} />

      {edition.pages.map((page, i) => (
        <div key={i} className="mx-print__sheet">
          <MoxiePage page={page} assets={edition.assets} imprint={imprint} />
        </div>
      ))}
    </main>
  );
}
