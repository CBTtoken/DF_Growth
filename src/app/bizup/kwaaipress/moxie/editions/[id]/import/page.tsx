import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePublisher } from "@/lib/emag/access";
import { MoxieNav } from "@/components/emag/MoxieNav";
import { PackImporter } from "@/components/emag/PackImporter";
import { importPack, previewPack } from "./actions";

export const metadata = { title: "Import a copy pack", robots: { index: false } };

export default async function ImportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePublisher();

  const supabase = createAdminClient();
  const { data: edition } = await supabase
    .from("emag_editions")
    .select("id, title")
    .eq("id", id)
    .maybeSingle();

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
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <MoxieNav
          trail={[
            { label: "Editions", href: "/bizup/kwaaipress/moxie/editions" },
            { label: edition.title, href: `/bizup/kwaaipress/moxie/editions/${edition.id}` },
            { label: "Import a copy pack" },
          ]}
        />

        <h1 style={{ fontSize: 26, margin: "0 0 6px", fontWeight: 700 }}>Import a copy pack</h1>
        <p style={{ fontSize: 14, color: "#6b6864", margin: "0 0 22px" }}>
          Into {edition.title}
        </p>

        <PackImporter editionId={edition.id} onPreview={previewPack} onImport={importPack} />
      </div>
    </main>
  );
}
