import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePublisher } from "@/lib/emag/access";
import { describeBlock, loadFlatplan, planPages } from "@/lib/emag/flatplan";
import { FlatplanBoard, type Row } from "@/components/emag/FlatplanBoard";
import { MoxieNav } from "@/components/emag/MoxieNav";
import { saveOrder, removeBlock } from "./actions";

// The flatplan. One screen, every block in the edition, drag to reorder.
//
// Publisher only. A writer can see their own article and submit it; the
// running order is not theirs to change, and the page numbers everything
// else depends on come from here.

export const metadata = { title: "Flatplan", robots: { index: false } };

export default async function FlatplanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePublisher();

  const supabase = createAdminClient();
  const { data: edition } = await supabase
    .from("emag_editions")
    .select("id, title, status, edition_no")
    .eq("id", id)
    .maybeSingle();

  if (!edition) notFound();

  const rows = await loadFlatplan(edition.id);
  const plan = planPages(rows);

  // The words each block shows are worked out here rather than in the
  // browser, so the client component stays about ordering and nothing else.
  const blocks: Row[] = plan.blocks.map((block) => {
    const { title, detail } = describeBlock(block);
    return { ...block, label: title, detail };
  });

  return (
    <main
      style={{
        background: "#f2efea",
        minHeight: "100vh",
        padding: "36px 24px 80px",
        fontFamily: "var(--font-geist-sans), Arial, sans-serif",
        color: "#1e2020",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <MoxieNav
          trail={[
            { label: "Editions", href: "/bizup/kwaaipress/moxie/editions" },
            { label: edition.title },
            { label: "Flatplan" },
          ]}
        />

        <h1 style={{ fontSize: 28, margin: "0 0 6px", fontWeight: 700 }}>
          {edition.title} flatplan
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: "#4a4744", margin: "0 0 22px", maxWidth: 640 }}>
          Drag a block, or use Up and Down. Page numbers on the left are worked out from this
          order and are never typed. Move two blocks and everything after them renumbers, and
          the contents page rebuilds to match.
        </p>

        <FlatplanBoard
          editionId={edition.id}
          blocks={blocks}
          problems={plan.problems}
          canEdit={edition.status !== "published"}
          onSave={saveOrder}
          onRemove={removeBlock}
        />

        {edition.status === "published" ? (
          <p style={{ marginTop: 18, fontSize: 14, color: "#7a5312", background: "#fdf5e6", padding: "10px 14px" }}>
            This edition is published, so the running order is locked. Readers already have
            these page numbers.
          </p>
        ) : null}

        <p style={{ marginTop: 26, fontSize: 14, display: "flex", gap: 20, flexWrap: "wrap" }}>
          <Link href={`/bizup/kwaaipress/moxie/editions/${edition.id}`} style={{ color: "#c85a1e" }}>
            Write and edit this edition&apos;s articles
          </Link>
          <Link href={`/bizup/kwaaipress/moxie/editions/${edition.id}/contents`} style={{ color: "#c85a1e" }}>
            See the contents page this produces
          </Link>
          <Link href={`/bizup/kwaaipress/moxie/editions/${edition.id}/preview`} style={{ color: "#c85a1e" }}>
            Preview the whole edition and publish
          </Link>
        </p>
      </div>
    </main>
  );
}
