import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublication, requireEmagUser } from "@/lib/emag/access";
import { loadFlatplan, planPages } from "@/lib/emag/flatplan";
import { contentsPage } from "@/lib/emag/contents";
import { MoxiePage } from "@/components/emag/Page";
import { MoxieNav } from "@/components/emag/MoxieNav";

// The contents page, drawn from the assembled edition.
//
// Nothing on it is stored. Every page number is read off the running order
// at the moment this renders, which is the point: there is no second copy
// of the numbering to fall out of step with the first.

export const metadata = { title: "Contents", robots: { index: false } };

export default async function ContentsPreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireEmagUser();

  const supabase = createAdminClient();
  const { data: edition } = await supabase
    .from("emag_editions")
    .select("id, title, next_edition_title, next_edition_note")
    .eq("id", id)
    .maybeSingle();

  if (!edition) notFound();

  const publication = await getPublication();
  const imprint = {
    site: publication?.site ?? "",
    credit: publication?.footer_credit ?? "",
  };

  const plan = planPages(await loadFlatplan(edition.id));

  // Where the contents sits in the running order is the publisher's
  // decision, so its own page number comes from the plan like everything
  // else. Falling back to 3 only covers an edition that has not had a
  // contents block added yet.
  const slot = plan.blocks.find((b) => b.kind === "contents");
  const page = contentsPage(plan.blocks, {
    folio: slot?.firstPage ?? 3,
    nextEdition: edition.next_edition_title
      ? { title: edition.next_edition_title, note: edition.next_edition_note ?? undefined }
      : undefined,
  });

  return (
    <main
      style={{
        background: "#e9e6e1",
        minHeight: "100vh",
        padding: "32px 24px 80px",
        fontFamily: "var(--font-geist-sans), Arial, sans-serif",
        color: "#1e2020",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <MoxieNav
          trail={[
            { label: "Editions", href: "/bizup/kwaaipress/moxie/editions" },
            { label: edition.title, href: `/bizup/kwaaipress/moxie/editions/${edition.id}/flatplan` },
            { label: "Contents" },
          ]}
        />
        <h1 style={{ fontSize: 26, margin: "0 0 6px", fontWeight: 700 }}>
          {edition.title} contents
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: "#4a4744", margin: "0 0 24px", maxWidth: 620 }}>
          Generated from the running order every time this page loads. Change the flatplan and
          this changes with it.
        </p>

        <div className="mx">
          <div className="mx-sheet" style={{ ["--mx-zoom" as string]: 0.72, margin: 0 }}>
            <MoxiePage page={page} assets={[]} imprint={imprint} />
          </div>
        </div>
      </div>
    </main>
  );
}
