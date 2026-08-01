import Link from "next/link";
import { MOXIE } from "@/lib/emag/publication";

// The builder's front door.
//
// Deliberately thin for now. The flatplan, the article editor and the
// edition list all land here as they are built, and until they exist a
// page that lists what does exist is more use than a placeholder that
// pretends otherwise.

export const metadata = { title: "Moxie eMag builder", robots: { index: false } };

const built = [
  {
    href: "/bizup/kwaaipress/moxie/editions",
    title: "Editions",
    body: "Start an edition, then order it on the flatplan. Page numbers and the contents page come from that order.",
  },
  {
    href: "/bizup/kwaaipress/moxie/rebuild",
    title: "July, rebuilt",
    body: "Published July pages beside the same content rendered by the builder. The check on whether the templates are right. A test harness, not part of the product.",
  },
  {
    href: "/bizup/kwaaipress/moxie/sections",
    title: "Sections and layouts",
    body: "The eight pillars, the seventeen standing sections, and which page structure each one maps onto.",
  },
];

export default function MoxieHome() {
  return (
    <main
      style={{
        background: "#f7f3ee",
        minHeight: "100vh",
        padding: "48px 24px 80px",
        fontFamily: "var(--font-geist-sans), Arial, sans-serif",
        color: "#1e2020",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <p
          style={{
            fontSize: 12,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            color: "#c85a1e",
            fontWeight: 700,
            margin: "0 0 6px",
          }}
        >
          Kwaai Press
        </p>
        <h1 style={{ fontSize: 30, margin: "0 0 12px", fontWeight: 700 }}>{MOXIE.name}</h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: "#4a4744", margin: "0 0 32px" }}>
          {MOXIE.definition}. Published on the first of the month, digital only. This is where
          an edition gets written, imaged, ordered and published, without leaving the browser.
        </p>

        {built.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "block",
              background: "#fff",
              border: "1px solid rgba(30,32,32,0.12)",
              borderLeft: "3px solid #c85a1e",
              padding: "18px 20px",
              marginBottom: 14,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <span style={{ display: "block", fontWeight: 700, fontSize: 17, marginBottom: 4 }}>
              {item.title}
            </span>
            <span style={{ display: "block", fontSize: 14, lineHeight: 1.55, color: "#5a5754" }}>
              {item.body}
            </span>
          </Link>
        ))}

        <p style={{ fontSize: 13, lineHeight: 1.6, color: "#7a7671", marginTop: 28 }}>
          Still to come, in this order: the article editor with its live preview, publishing
          and the PDF export toggle, then a screen for creating writer accounts.
        </p>
      </div>
    </main>
  );
}
