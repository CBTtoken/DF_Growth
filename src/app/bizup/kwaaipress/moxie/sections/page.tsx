import { MOXIE, pillarFor, type LayoutKey } from "@/lib/emag/publication";
import { MoxieNav } from "@/components/emag/MoxieNav";

// The structure, and the honest answer to "how many layouts are there".
//
// Section 3 of the Editorial and Design Reference gives eight editorial
// pillars and four structural labels. Section 8 gives seventeen standing
// sections underneath them. That is not seventeen page structures: there
// are four editorial ones, plus the cover, the generated contents page and
// an advertisement slot, and every section maps onto one of them.
//
// A pillar is the territory and the label on the left of the section label
// bar. A section is the standing slot and the label on the right. A layout
// is where things sit on the page. Three different things, and the first
// version of this build collapsed them into one.
//
// Dewald: the pillars are guidelines rather than fixed, so this screen
// reads them from configuration and will gain editing once the flatplan is
// in place.

export const metadata = { title: "Moxie sections", robots: { index: false } };

const LAYOUTS: Record<LayoutKey, { name: string; what: string }> = {
  cover: {
    name: "Cover",
    what: "Full-bleed photograph, the logotype, one cover line and the also-in-this-edition list. Front and back.",
  },
  contents: {
    name: "Contents",
    what: "Generated from the flatplan after ordering, with the Next Edition teaser at the base. Page numbers are read off the assembled edition, never typed.",
  },
  "hero-opener": {
    name: "Hero opener",
    what: "A photograph or a 52mm charcoal band carrying the headline, then the standfirst and running text. Settings decide the hero height and how the type sits on it.",
  },
  "band-opener": {
    name: "Band opener",
    what: "The same page with no photograph: the charcoal band carries the headline on its own. What a one-page section opens on.",
  },
  runon: {
    name: "Run-on",
    what: "Every page of an article after the first. Section label bar, running text, images in the column, and no hero band.",
  },
  list: {
    name: "List",
    what: "Repeating labelled rows rather than running text. The events calendar, the puzzle pages, five things, the SVC spread.",
  },
  advert: {
    name: "Advertisement",
    what: "A slot holding supplied artwork at full page, half horizontal, half vertical or quarter. Two quarters share a page. Moxie never designs the advertisement.",
  },
  "rate-card": {
    name: "Rate card",
    what: "A calm, tabular business document rather than an editorial page: modest header, thin rules, prices in clean rows. The same blocks as any article, so next edition's prices are edited, not redesigned.",
  },
};

export default function MoxieSectionsPage() {
  const layouts = Object.keys(LAYOUTS) as LayoutKey[];
  const editorial = MOXIE.pillars.filter((p) => !p.structural);
  const structural = MOXIE.pillars.filter((p) => p.structural);

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
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <MoxieNav trail={[{ label: "Sections and layouts" }]} />
        <h1 style={{ fontSize: 28, margin: "0 0 10px", fontWeight: 700 }}>
          Pillars, sections and layouts
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: "#4a4744", margin: "0 0 36px" }}>
          Eight editorial pillars, four structural labels, seventeen standing sections, seven
          page structures. The pillar prints on the left of the section label bar in orange.
          The section prints on the right in charcoal.
        </p>

        <h2 style={h2}>Editorial pillars</h2>
        <div style={{ marginBottom: 28 }}>
          {editorial.map((p) => (
            <div key={p.key} style={{ ...card, borderLeftColor: p.teal ? "#0b6e6e" : "#c85a1e" }}>
              <span style={cardTitle}>
                {p.label}
                {p.teal ? (
                  <span style={{ ...tag, background: "#0b6e6e" }}>own teal treatment</span>
                ) : null}
              </span>
              <span style={cardBody}>{p.territory}</span>
            </div>
          ))}
        </div>

        <h2 style={h2}>Structural labels</h2>
        <div style={{ marginBottom: 28 }}>
          {structural.map((p) => (
            <div key={p.key} style={{ ...card, borderLeftColor: "#1e2020" }}>
              <span style={cardTitle}>{p.label}</span>
              <span style={cardBody}>{p.territory}</span>
            </div>
          ))}
        </div>

        <h2 style={h2}>The layouts</h2>
        <div style={{ marginBottom: 28 }}>
          {layouts.map((key) => (
            <div key={key} style={{ ...card, borderLeftColor: "#1e2020" }}>
              <span style={cardTitle}>{LAYOUTS[key].name}</span>
              <span style={cardBody}>{LAYOUTS[key].what}</span>
            </div>
          ))}
        </div>

        <h2 style={h2}>Standing sections, in running order</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr>
                <th style={th}>Section</th>
                <th style={th}>Pillar</th>
                <th style={th}>Pages</th>
                <th style={th}>Opens on</th>
                <th style={th}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {MOXIE.sections.map((s, i) => (
                <tr key={`${s.key}-${i}`}>
                  <td style={{ ...td, fontWeight: 700, whiteSpace: "nowrap" }}>{s.title}</td>
                  <td
                    style={{
                      ...td,
                      whiteSpace: "nowrap",
                      color: pillarFor(s.pillar).teal ? "#0b6e6e" : "#c85a1e",
                      fontWeight: 600,
                    }}
                  >
                    {pillarFor(s.pillar).label}
                  </td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{s.pages}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{LAYOUTS[s.defaultLayout].name}</td>
                  <td style={{ ...td, color: "#5a5754" }}>{s.notes ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

const h2 = {
  fontSize: 13,
  letterSpacing: "0.09em",
  textTransform: "uppercase" as const,
  color: "#c85a1e",
  fontWeight: 700,
  margin: "0 0 14px",
};
const card = {
  display: "block",
  background: "#fff",
  border: "1px solid rgba(30,32,32,0.12)",
  borderLeft: "3px solid #1e2020",
  padding: "13px 18px",
  marginBottom: 8,
};
const cardTitle = {
  display: "block",
  fontWeight: 700,
  fontSize: 16,
  marginBottom: 3,
};
const cardBody = { display: "block", fontSize: 14, lineHeight: 1.55, color: "#5a5754" };
const tag = {
  display: "inline-block",
  marginLeft: 8,
  padding: "2px 7px",
  fontSize: 10,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
  color: "#fff",
  verticalAlign: "middle",
};
const th = {
  textAlign: "left" as const,
  padding: "8px 12px 8px 0",
  borderBottom: "2px solid rgba(30,32,32,0.25)",
  fontSize: 12,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
  color: "#7a7671",
};
const td = {
  padding: "10px 12px 10px 0",
  borderBottom: "1px solid rgba(30,32,32,0.1)",
  verticalAlign: "top" as const,
  lineHeight: 1.5,
};
