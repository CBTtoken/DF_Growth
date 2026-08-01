import { MoxiePage } from "@/components/emag/Page";
import { MoxieNav } from "@/components/emag/MoxieNav";
import type { Asset, RenderedPage } from "@/lib/emag/types";
import july from "@/lib/emag/fixtures/july-2026.json";

// The July rebuild, side by side with the published page it is copying.
//
// This screen exists to answer one question before anything is built on
// top of the templates: is this Moxie, or are the headings wrong. It is
// deliberately the first thing that works, because if the templates are
// off then the flatplan, the contents page and the editor are all off too,
// and the cheapest moment to find that out is now.
//
// The content is July's own, transcribed from the published pages. No
// placeholder copy: a page of invented text laid out beautifully would
// prove nothing about whether this matches the magazine.

export const metadata = { title: "Moxie: July rebuild" };

type Comparison = {
  label: string;
  note: string;
  reference: string;
  page: RenderedPage;
};

const JULY_IMPRINT = { site: "moxiemag.co.za", credit: "A Smart Value Club Publication" };

const assets = july.assets as Asset[];
const pages = july.pages as unknown as RenderedPage[];

const comparisons: Comparison[] = [
  {
    label: "Think, The Big Idea",
    note: "The standard editorial opener: banner photograph, headline over it, ruled standfirst, serif running text, an inline image with the text wrapped around it, and a pull quote.",
    reference: "/emag/reference/july2026/original-think.png",
    page: pages[0],
  },
  {
    label: "Thrive, The Quiet Hero",
    note: "Supplied artwork and the mandatory stat block above the masthead, then a 52mm charcoal band carrying a headline that turns colour into the partner's own green. At the reference's type sizes this no longer fits one page, and the reference says The Quiet Hero is a two-page section, so it runs on.",
    reference: "/emag/reference/july2026/original-thrive.png",
    page: pages[1],
  },
  {
    label: "Thrive, run-on page",
    note: "The continuation layout: section label bar, running text, no hero. Sparse here because July page 14 is not among the pages I have, so only the text that carried over from page 13 is on it. The Moxie Tip and the Know Someone Remarkable CTA belong at the foot of this page.",
    reference: "/emag/reference/july2026/original-thrive.png",
    page: pages[2],
  },
  {
    label: "SA Personality",
    note: "The same opener template with different settings: a tall portrait and the type in a solid band across it rather than a gradient. This one deliberately no longer matches the published page. July set it in Helvetica, and the Editorial and Design Reference names Helvetica as a face that must never appear anywhere, so the rebuild uses Playfair and Source Serif like every other page.",
    reference: "/emag/reference/july2026/original-personality.png",
    page: pages[3],
  },
];

export default function MoxieRebuildPage() {
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
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <MoxieNav trail={[{ label: "July rebuild" }]} />
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
          Moxie eMag builder
        </p>
        <h1 style={{ fontSize: 30, margin: "0 0 10px", fontWeight: 700 }}>
          July, rebuilt through the templates
        </h1>
        <p style={{ maxWidth: 760, fontSize: 15, lineHeight: 1.6, margin: "0 0 4px", color: "#4a4744" }}>
          Left is the published July page. Right is the same content rendered by the builder.
          Nothing on the right is a picture of a page: it is live HTML at A4, scaled to fit,
          and it is what the reader and the PDF export will both come from.
        </p>
        <p style={{ maxWidth: 760, fontSize: 15, lineHeight: 1.6, margin: 0, color: "#4a4744" }}>
          The question to answer is whether the shapes and the type are right. Spacing and
          size are quick to change. The wrong headline face is not.
        </p>

        {comparisons.map((c) => (
          <section key={c.label} style={{ marginTop: 44 }}>
            <h2
              style={{
                fontSize: 19,
                fontWeight: 700,
                margin: "0 0 4px",
                paddingBottom: 8,
                borderBottom: "1px solid rgba(30,32,32,0.16)",
              }}
            >
              {c.label}
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: "#5a5754", margin: "8px 0 18px", maxWidth: 820 }}>
              {c.note}
            </p>

            {/* Both columns are pinned to the same width so the comparison is
                honest. A published page is a picture that will scale to
                whatever box it is given; a rebuilt page is a fixed physical
                object that has to be scaled deliberately. Left to a fluid
                grid the two end up at different sizes and every difference
                in the type looks larger or smaller than it is. */}
            <div style={{ overflowX: "auto", paddingBottom: 8 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(2, ${COMPARE_W}px)`,
                  gap: 28,
                  alignItems: "start",
                  width: "min-content",
                }}
              >
                <figure style={{ margin: 0 }}>
                  <figcaption style={captionStyle}>Published July page</figcaption>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.reference}
                    alt={`The published July page for ${c.label}`}
                    style={{ display: "block", width: COMPARE_W, height: "auto", boxShadow: SHADOW }}
                  />
                </figure>

                <figure style={{ margin: 0 }} className="mx">
                  <figcaption style={captionStyle}>Rebuilt by the builder</figcaption>
                  <div
                    className="mx-sheet"
                    style={{ ["--mx-zoom" as string]: COMPARE_ZOOM, boxShadow: SHADOW, margin: 0 }}
                  >
                    <MoxiePage page={c.page} assets={assets} imprint={JULY_IMPRINT} />
                  </div>
                </figure>
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

const SHADOW = "0 1px 2px rgba(0,0,0,0.16), 0 8px 24px rgba(0,0,0,0.12)";

// A4's width in CSS pixels is 210mm at 96dpi, which is 793.7. The zoom is
// derived from the column width rather than typed, so changing one number
// keeps the two sides the same size.
const COMPARE_W = 470;
const COMPARE_ZOOM = Number((COMPARE_W / ((210 * 96) / 25.4)).toFixed(4));

const captionStyle = {
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  fontWeight: 700,
  color: "#7a7671",
  margin: "0 0 10px",
};
