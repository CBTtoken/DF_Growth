import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublication, requireEmagUser } from "@/lib/emag/access";
import { loadArticle } from "@/lib/emag/articles";
import { MOXIE, type LayoutKey } from "@/lib/emag/publication";
import { ArticleEditor } from "@/components/emag/ArticleEditor";
import { PictureManager } from "@/components/emag/PictureManager";
import { MoxieNav } from "@/components/emag/MoxieNav";
import {
  approveArticle,
  createUploadUrl,
  deleteArticle,
  deleteAsset,
  saveArticle,
  saveAsset,
  submitArticle,
} from "../actions";
import { DeleteArticleButton } from "@/components/emag/DeleteArticleButton";
import { askCoEditor } from "../coeditor-actions";

// One article, open for editing, with its finished pages beside it.

/**
 * Saves a change to a picture's placement made from inside the body.
 *
 * The editor holds the picture in front of it, so it only sends what
 * changed. The stored path is read back here rather than carried through
 * the browser, because it is the one field on an asset the publisher never
 * sets and never should be able to.
 */
async function patchAsset(assetId: string, changes: Record<string, unknown>) {
  "use server";
  const { updateAssetPlacement } = await import("../actions");
  await updateAssetPlacement(assetId, changes);
}

export const metadata = { title: "Article", robots: { index: false } };

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireEmagUser();

  const article = await loadArticle(id);
  if (!article) notFound();

  const publication = await getPublication();

  const supabase = createAdminClient();
  const { data: edition } = await supabase
    .from("emag_editions")
    .select("id, title")
    .eq("id", article.editionId)
    .maybeSingle();

  return (
    <main
      style={{
        background: "#f2efea",
        minHeight: "100vh",
        padding: "28px 24px 80px",
        fontFamily: "var(--font-geist-sans), Arial, sans-serif",
        color: "#1e2020",
      }}
    >
      <div style={{ maxWidth: 1320, margin: "0 auto" }}>
        <MoxieNav
          trail={[
            { label: "Editions", href: "/bizup/kwaaipress/moxie/editions" },
            { label: edition?.title ?? "Edition", href: `/bizup/kwaaipress/moxie/editions/${article.editionId}` },
            { label: article.title },
          ]}
        />

        <PictureManager
          articleId={article.id}
          assets={article.assets}
          onRequestUpload={createUploadUrl}
          onSave={saveAsset}
          onDelete={deleteAsset}
        />

        <ArticleEditor
          articleId={article.id}
          editionId={article.editionId}
          editionTitle={edition?.title ?? ""}
          pillars={MOXIE.pillars.map((p) => ({ key: p.key, label: p.label }))}
          sections={MOXIE.sections.map((s) => ({
            title: s.title,
            pillar: s.pillar,
            layout: s.defaultLayout,
          }))}
          initial={{
            pillar: article.pillar,
            section: article.section,
            title: article.title,
            writer: article.writer ?? "",
            layout: article.layout as LayoutKey,
            opener: article.opener,
            blocks: article.blocks,
            tighten: article.tighten,
          }}
          assets={article.assets}
          imprint={{
            site: publication?.site ?? "",
            credit: publication?.footer_credit ?? "",
          }}
          onAssetPatch={patchAsset}
          onAskCoEditor={askCoEditor}
          status={article.status}
          canApprove={user.role === "publisher"}
          onSave={saveArticle}
          onSubmit={submitArticle}
          onApprove={approveArticle}
        />

        <div style={{ marginTop: 26, paddingTop: 16, borderTop: "1px solid rgba(30,32,32,0.14)" }}>
          <DeleteArticleButton
            articleId={article.id}
            editionId={article.editionId}
            title={article.title}
            onDelete={deleteArticle}
          />
        </div>
      </div>
    </main>
  );
}

// A page.tsx may only export a fixed set of names, and an extra one is a
// type error against Next's generated route types. This was an unused
// DEFAULT_PILLAR that nothing imported, so it is simply gone rather than
// moved. If a default pillar is ever needed again it belongs in
// publication.ts with the rest of the publication's own values.
