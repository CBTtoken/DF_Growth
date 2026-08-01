import { requirePublisher, getPublication } from "@/lib/emag/access";
import { DesignSettingsForm } from "@/components/emag/DesignSettingsForm";
import { MoxieNav } from "@/components/emag/MoxieNav";
import type { RenderedPage } from "@/lib/emag/types";
import type { DesignSettings } from "@/lib/emag/design";
import { saveDesign } from "./actions";

// Settings. The screen behind "can I make the footer bigger".
//
// Everything here is a named control. There is no box to type CSS into,
// and that is a deliberate limit rather than an omission: the page count an
// article occupies is measured from these values, so a rule that could
// change layout in a way the measurer does not understand would break the
// flatplan and the contents page. A named control cannot.

export const metadata = { title: "Moxie settings", robots: { index: false } };

/**
 * The page shown beside the controls.
 *
 * Written here rather than pulled from a real article on purpose. It has to
 * exercise every value on the screen, so it carries a headline, a kicker, a
 * standfirst, running text, a subheading, a pull quote and a caption,
 * whether or not any real article happens to.
 */
const SAMPLE: RenderedPage = {
  layout: "band-opener",
  head: { pillar: "think", section: "The Big Idea" },
  folio: 12,
  opener: {
    kicker: "How this page is put together",
    headline: "Every size on this page",
    headlineTurn: "is yours to change.",
    standfirst: {
      text: "This is a standfirst. It introduces the article and sits between two hairlines, and it is the first thing a reader takes in after the headline.",
    },
  },
  blocks: [
    {
      type: "p",
      content: {
        text: "This is body text, which is the size everything else on the page is judged against. Change it and the number of pages an article occupies changes with it, because the pages are measured from these settings rather than guessed at.",
      },
    },
    { type: "subhead", text: "A subheading looks like this" },
    {
      type: "p",
      content: {
        text: "A second paragraph, so the gap between paragraphs is visible. The space above a subheading and below it are set separately, because a heading that sits too close to the text above it reads as though it belongs to the wrong section.",
      },
    },
    {
      type: "pullquote",
      tone: "teal",
      content: { text: "A pull quote, in the display face, with a coloured rule beside it." },
    },
  ],
};

export default async function SettingsPage() {
  await requirePublisher();
  const publication = await getPublication();

  if (!publication) {
    return (
      <main style={{ padding: 40, fontFamily: "sans-serif" }}>
        No publication is set up yet.
      </main>
    );
  }

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
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <MoxieNav trail={[{ label: "Settings" }]} />

        <h1 style={{ fontSize: 28, margin: "0 0 6px", fontWeight: 700 }}>Settings</h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: "#4a4744", margin: "0 0 24px", maxWidth: 660 }}>
          Change a size and the page beside it changes as you type. Nothing is saved until you
          press Save, and then every page of every edition uses it, including the PDF.
        </p>

        <DesignSettingsForm
          publicationId={publication.id}
          initial={(publication.design ?? {}) as DesignSettings}
          samplePage={SAMPLE}
          imprint={{ site: publication.site ?? "", credit: publication.footer_credit ?? "" }}
          onSave={saveDesign}
        />
      </div>
    </main>
  );
}
