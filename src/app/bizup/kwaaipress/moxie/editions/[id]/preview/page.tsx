import { notFound } from "next/navigation";
import { getPublication, requirePublisher } from "@/lib/emag/access";
import { assembleEdition } from "@/lib/emag/assemble";
import { MoxiePage } from "@/components/emag/Page";
import { MoxieNav } from "@/components/emag/MoxieNav";
import { PublishPanel } from "@/components/emag/PublishPanel";
import { publishEdition, setPdfEnabled, unpublishEdition } from "./actions";

// The whole edition, end to end, exactly as a reader will see it.
//
// Not a summary and not a proof: these are the same components at the same
// size that the published edition and the PDF both come from, scaled to fit
// a screen. What is here is what goes out.

export const metadata = { title: "Edition preview", robots: { index: false } };

export default async function EditionPreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePublisher();

  const [edition, publication] = await Promise.all([assembleEdition(id), getPublication()]);
  if (!edition) notFound();

  const imprint = {
    site: publication?.site ?? "",
    credit: publication?.footer_credit ?? "",
  };

  const readUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002"}/bizup/kwaaipress/moxie/read/${edition.slug}`;

  return (
    <main
      style={{
        background: "#e9e6e1",
        minHeight: "100vh",
        padding: "28px 24px 80px",
        fontFamily: "var(--font-geist-sans), Arial, sans-serif",
        color: "#1e2020",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <MoxieNav
          trail={[
            { label: "Editions", href: "/bizup/kwaaipress/moxie/editions" },
            { label: edition.title, href: `/bizup/kwaaipress/moxie/editions/${id}` },
            { label: "Preview and publish" },
          ]}
        />

        <h1 style={{ fontSize: 28, margin: "0 0 6px", fontWeight: 700 }}>{edition.title}</h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: "#4a4744", margin: "0 0 20px" }}>
          {edition.pages.length} pages, in running order. This is what a reader gets.
        </p>

        <PublishPanel
          editionId={id}
          status={edition.status}
          pdfEnabled={edition.pdfEnabled}
          readUrl={readUrl}
          problems={edition.problems}
          onPublish={publishEdition}
          onUnpublish={unpublishEdition}
          onSetPdf={setPdfEnabled}
        />

        <div className="mx" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {edition.pages.map((page, i) => (
            <div key={i} className="mx-sheet" style={{ ["--mx-zoom" as string]: 0.62, margin: 0 }}>
              <MoxiePage page={page} assets={edition.assets} imprint={imprint} />
            </div>
          ))}
        </div>

        {edition.pages.length === 0 ? (
          <p style={{ fontSize: 15, color: "#6b6864" }}>
            Nothing in the running order yet. Approve an article and it appears here.
          </p>
        ) : null}
      </div>
    </main>
  );
}
