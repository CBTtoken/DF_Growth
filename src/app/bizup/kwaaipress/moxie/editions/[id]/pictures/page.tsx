import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePublisher } from "@/lib/emag/access";
import { assetUrl } from "@/lib/emag/articles";
import { AD_FORMATS, type AdFormat } from "@/lib/emag/publication";
import { EditionPictures } from "@/components/emag/EditionPictures";
import { MoxieNav } from "@/components/emag/MoxieNav";
import {
  createEditionUploadUrl,
  renameAdvertiser,
  setAccessCode,
  setAdArtwork,
  setCover,
} from "./actions";

// The cover, the advertisers' artwork, and who may read the edition.

export const metadata = { title: "Edition pictures", robots: { index: false } };

export default async function EditionPicturesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePublisher();

  const supabase = createAdminClient();
  const [{ data: edition }, { data: ads }] = await Promise.all([
    supabase
      .from("emag_editions")
      .select("id, title, cover_path, access_code")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("emag_ads")
      .select("id, advertiser, format, position_code, artwork_path")
      .eq("edition_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!edition) notFound();

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
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <MoxieNav
          trail={[
            { label: "Editions", href: "/bizup/kwaaipress/moxie/editions" },
            { label: edition.title, href: `/bizup/kwaaipress/moxie/editions/${id}` },
            { label: "Pictures and access" },
          ]}
        />

        <h1 style={{ fontSize: 28, margin: "0 0 6px", fontWeight: 700 }}>
          {edition.title}, pictures and access
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: "#4a4744", margin: "0 0 22px" }}>
          The cover and the advertisers&apos; artwork belong to the edition rather than to any
          article, so they live here. Pictures inside an article are uploaded on the article
          itself.
        </p>

        <EditionPictures
          editionId={id}
          cover={edition.cover_path ? assetUrl(edition.cover_path) : null}
          accessCode={edition.access_code ?? ""}
          ads={(ads ?? []).map((ad) => ({
            id: ad.id,
            advertiser: ad.advertiser,
            format: ad.format,
            formatLabel: AD_FORMATS[ad.format as AdFormat]?.label ?? ad.format,
            positionCode: ad.position_code,
            artwork: ad.artwork_path ? assetUrl(ad.artwork_path) : null,
          }))}
          onRequestUpload={createEditionUploadUrl}
          onSetCover={setCover}
          onSetArtwork={setAdArtwork}
          onRename={renameAdvertiser}
          onSetAccessCode={setAccessCode}
        />
      </div>
    </main>
  );
}
