import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireEmagUser } from "@/lib/emag/access";
import { listArticles } from "@/lib/emag/articles";
import { MoxieNav } from "@/components/emag/MoxieNav";
import { saveArticle } from "../../articles/actions";

// An edition's articles. The way in to writing, and the way through to the
// flatplan.

export const metadata = { title: "Edition", robots: { index: false } };

const STATUS_WORDS: Record<string, string> = {
  draft: "Draft",
  submitted: "Waiting for approval",
  approved: "Approved",
};

async function startArticle(formData: FormData) {
  "use server";
  const editionId = String(formData.get("editionId"));
  const id = await saveArticle({
    editionId,
    pillar: "discover",
    section: "Cover Story",
    title: "Untitled",
    layout: "hero-opener",
    opener: { headline: "" },
    blocks: [{ type: "p", content: { text: "" } }],
  });
  redirect(`/bizup/kwaaipress/moxie/articles/${id}`);
}

export default async function EditionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireEmagUser();

  const supabase = createAdminClient();
  const { data: edition } = await supabase
    .from("emag_editions")
    .select("id, title, status")
    .eq("id", id)
    .maybeSingle();
  if (!edition) notFound();

  const articles = await listArticles(edition.id);

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
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <MoxieNav
          trail={[
            { label: "Editions", href: "/bizup/kwaaipress/moxie/editions" },
            { label: edition.title },
          ]}
        />

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 28, margin: "0 0 16px", fontWeight: 700 }}>{edition.title}</h1>
          <span style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link href={`/bizup/kwaaipress/moxie/editions/${edition.id}/pictures`} style={{ color: "#c85a1e", fontWeight: 600, fontSize: 14 }}>
              Cover, adverts and access
            </Link>
            <Link href={`/bizup/kwaaipress/moxie/editions/${edition.id}/flatplan`} style={{ color: "#c85a1e", fontWeight: 600, fontSize: 14 }}>
              Flatplan
            </Link>
          </span>
        </div>

        {articles.length === 0 ? (
          <p style={{ fontSize: 15, lineHeight: 1.6, color: "#4a4744" }}>
            No articles yet. Start one, paste the text in, and it joins the flatplan once it is
            approved.
          </p>
        ) : (
          articles.map((article) => (
            <Link key={article.id} href={`/bizup/kwaaipress/moxie/articles/${article.id}`} style={card}>
              <span style={{ flex: "1 1 auto", minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 700, fontSize: 16 }}>
                  {article.title}
                </span>
                <span style={{ display: "block", fontSize: 13, color: "#6b6864", marginTop: 3 }}>
                  {[article.pillar, article.section, article.writer].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span style={{ fontSize: 13, color: article.status === "approved" ? "#1f6b2b" : "#6b6864", whiteSpace: "nowrap" }}>
                {STATUS_WORDS[article.status]}
                {article.page_count ? `, ${article.page_count} pages` : ""}
              </span>
            </Link>
          ))
        )}

        <form action={startArticle} style={{ marginTop: 22 }}>
          <input type="hidden" name="editionId" value={edition.id} />
          <button type="submit" style={button}>
            Start an article
          </button>
        </form>
      </div>
    </main>
  );
}

const card = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  background: "#fff",
  border: "1px solid rgba(30,32,32,0.12)",
  borderLeft: "3px solid #1e2020",
  padding: "13px 17px",
  marginBottom: 7,
  textDecoration: "none",
  color: "inherit",
};

const button = {
  border: 0,
  background: "#1e2020",
  color: "#fff",
  padding: "10px 20px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};
