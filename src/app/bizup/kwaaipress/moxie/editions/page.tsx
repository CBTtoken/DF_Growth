import Link from "next/link";
import { MoxieNav } from "@/components/emag/MoxieNav";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireEmagUser } from "@/lib/emag/access";
import { createEdition } from "./actions";

// Every edition, and the way a new one starts.
//
// Writers see the list because they need to know which edition they are
// writing into. Only a publisher can start one.

export const metadata = { title: "Moxie editions", robots: { index: false } };

const STATUS_WORDS: Record<string, string> = {
  draft: "In progress",
  ready: "Ready to publish",
  published: "Published",
};

export default async function EditionsPage() {
  const user = await requireEmagUser();
  const supabase = createAdminClient();

  const { data: editions } = await supabase
    .from("emag_editions")
    .select("id, title, edition_no, status, published_at")
    .eq("publication_id", user.publicationId)
    .order("created_at", { ascending: false });

  const list = editions ?? [];

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
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <MoxieNav trail={[{ label: "Editions" }]} />
        <h1 style={{ fontSize: 28, margin: "0 0 22px", fontWeight: 700 }}>Editions</h1>

        {list.length === 0 ? (
          <p style={{ fontSize: 15, lineHeight: 1.6, color: "#4a4744" }}>
            No editions yet.
          </p>
        ) : (
          // The edition's own screen is where the articles are, so that is
          // what the row opens. Linking only to the flatplan, which is what
          // this did at first, left the article editor with no way in at
          // all: every door on this screen led to a page showing the same
          // three empty structural blocks.
          list.map((edition) => (
            <div key={edition.id} style={card}>
              <Link
                href={`/bizup/kwaaipress/moxie/editions/${edition.id}`}
                style={{ flex: "1 1 auto", minWidth: 0, textDecoration: "none", color: "inherit" }}
              >
                <span style={{ display: "block", fontWeight: 700, fontSize: 17 }}>
                  {edition.title}
                </span>
                <span style={{ display: "block", fontSize: 13, color: "#6b6864", marginTop: 3 }}>
                  {edition.edition_no ? `Edition ${String(edition.edition_no).padStart(2, "0")} · ` : ""}
                  {STATUS_WORDS[edition.status] ?? edition.status}
                </span>
              </Link>
              <Link href={`/bizup/kwaaipress/moxie/editions/${edition.id}`} style={rowLink}>
                Articles
              </Link>
              <Link href={`/bizup/kwaaipress/moxie/editions/${edition.id}/flatplan`} style={rowLink}>
                Flatplan
              </Link>
              <Link href={`/bizup/kwaaipress/moxie/editions/${edition.id}/preview`} style={rowLink}>
                Publish
              </Link>
            </div>
          ))
        )}

        {user.role === "publisher" ? (
          <form action={createEdition} style={{ ...card, display: "block", marginTop: 26 }}>
            <span style={{ display: "block", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
              Start an edition
            </span>
            <span style={{ display: "block", fontSize: 13.5, color: "#6b6864", marginBottom: 12 }}>
              It begins with a cover, a contents page and a back cover already in the running
              order. Articles join as they are approved.
            </span>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                name="title"
                placeholder="August 2026"
                required
                style={{ ...input, flex: "2 1 200px" }}
              />
              <input
                name="edition_no"
                placeholder="Edition number"
                inputMode="numeric"
                style={{ ...input, flex: "1 1 130px" }}
              />
              <button type="submit" style={button}>
                Start
              </button>
            </div>
          </form>
        ) : null}
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
  borderLeft: "3px solid #c85a1e",
  padding: "14px 18px",
  marginBottom: 8,
};

const rowLink = {
  flex: "0 0 auto",
  fontSize: 14,
  color: "#c85a1e",
  fontWeight: 600,
  textDecoration: "none",
  whiteSpace: "nowrap" as const,
};

const input = {
  border: "1px solid rgba(30,32,32,0.25)",
  padding: "9px 11px",
  fontSize: 14,
  fontFamily: "inherit",
};

const button = {
  border: 0,
  background: "#1e2020",
  color: "#fff",
  padding: "9px 20px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};
