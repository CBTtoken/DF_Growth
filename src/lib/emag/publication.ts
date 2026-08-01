// The publication's own settings, in one place.
//
// Everything here comes from the Editorial and Design Reference 2026, which
// is the single source of truth and supersedes the earlier Production
// Layout Guide where values differ. Nothing downstream reads a hex code or
// a section name directly; it reads this.
//
// The reference draws a distinction the first version of this file missed.
// A pillar is the editorial territory and it prints on the left of the
// section label bar in orange. A section is the standing slot inside that
// pillar and it prints on the right in charcoal. Fifteen "sections" was a
// misreading of eight pillars, four structural labels, and seventeen
// standing sections sitting underneath them.
//
// Dewald, 1 August 2026: the pillars are guidelines rather than a fixed
// list, and he expects to edit them. So they are data.

export type PillarKey =
  | "discover"
  | "explore"
  | "roam"
  | "gather"
  | "thrive"
  | "believe"
  | "think"
  | "play"
  | "open"
  | "personality"
  | "partner"
  | "savings"
  | "cover";

// The page structures. Deliberately far fewer than there are sections.
export type LayoutKey =
  | "cover"
  | "contents"
  | "hero-opener"
  | "band-opener"
  | "runon"
  | "list"
  | "advert";

export type Pillar = {
  key: PillarKey;
  /** Prints on the left of the section label bar, in orange, underlined. */
  label: string;
  territory: string;
  /** Structural labels carry sections that sit outside the editorial run. */
  structural?: boolean;
  /**
   * BELIEVE is the only pillar with its own visual treatment: teal hero
   * band and teal left margin rule instead of charcoal and orange.
   */
  teal?: boolean;
};

export type StandingSection = {
  key: string;
  /** Prints on the right of the section label bar, in charcoal. */
  title: string;
  pillar: PillarKey;
  /** Typical extent, from the reference's fixed section structure. */
  pages: number;
  words?: string;
  defaultLayout: LayoutKey;
  notes?: string;
};

export type Publication = {
  slug: string;
  name: string;
  tagline: string;
  definition: string;
  site: string;
  contact: string;
  footerCredit: string;
  palette: Record<string, string>;
  pillars: Pillar[];
  sections: StandingSection[];
};

export const MOXIE: Publication = {
  slug: "moxie",
  name: "Moxie Magazine",
  tagline: "Have the Moxie.",
  definition: "South Africa's family discovery magazine",
  site: "moxiemag.co.za",
  contact: "editor@moxiemag.co.za",
  footerCredit: "A Smart Value Club Publication",

  // Section 4. The first four were sampled independently off the published
  // pages at 300dpi and came back identical to the reference, which is a
  // useful confirmation that the PNG exports are true to the source.
  palette: {
    orange: "#c85a1e",
    teal: "#0b6e6e",
    charcoal: "#1e2020",
    cream: "#f7f3ee",
    border: "#e0d8d0",
    mint: "#a8d0d0",
    caption: "#888888",
  },

  pillars: [
    { key: "discover", label: "Discover", territory: "Curiosity, science, the unexpected" },
    { key: "explore", label: "Explore", territory: "Deep South African history with modern relevance" },
    { key: "roam", label: "Roam", territory: "Parks, travel, place, events" },
    { key: "gather", label: "Gather", territory: "Food, recipes, the table" },
    { key: "thrive", label: "Thrive", territory: "People doing quiet, remarkable work" },
    {
      key: "believe",
      label: "Believe",
      territory: "Faith, reflection, the Word of the Month",
      teal: true,
    },
    { key: "think", label: "Think", territory: "Science, tech, society, ideas" },
    { key: "play", label: "Play", territory: "Family puzzles, quizzes, games" },
    {
      key: "open",
      label: "Open",
      territory: "Editor's Letter and reader submissions",
      structural: true,
    },
    {
      key: "personality",
      label: "Personality",
      territory: "The SA Personality feature",
      structural: true,
    },
    {
      key: "partner",
      label: "Partner",
      territory: "Advertorials, always clearly labelled",
      structural: true,
    },
    {
      key: "savings",
      label: "Savings",
      territory: "The Smart Value Club spread",
      structural: true,
    },
    { key: "cover", label: "Cover", territory: "Front and back covers", structural: true },
  ],

  // Section 8. Names and sequence never change; topics change every
  // edition. This is the default running order the flatplan starts from.
  sections: [
    { key: "cover", title: "Cover", pillar: "cover", pages: 1, defaultLayout: "cover" },
    {
      key: "editors-letter",
      title: "Editor's Letter",
      pillar: "open",
      pages: 1,
      words: "400-600",
      defaultLayout: "band-opener",
      notes: "Founding team sign-off, all four names.",
    },
    {
      key: "contents",
      title: "Contents",
      pillar: "cover",
      pages: 1,
      defaultLayout: "contents",
      notes: "Built last, from the assembled edition. Next Edition teaser at the base.",
    },
    {
      key: "cover-story",
      title: "Cover Story",
      pillar: "discover",
      pages: 7,
      words: "1 200-2 000",
      defaultLayout: "hero-opener",
      notes: "Four-column fact grid on the opener. Writer credit at the close.",
    },
    {
      key: "five-things",
      title: "5 Things You Didn't Know",
      pillar: "discover",
      pages: 1,
      words: "50-80 each",
      defaultLayout: "list",
      notes: "Illustrated. Always South African.",
    },
    {
      key: "quiet-hero",
      title: "The Quiet Hero",
      pillar: "thrive",
      pages: 2,
      words: "800-1 200",
      defaultLayout: "hero-opener",
      notes: "Stat block mandatory, immediately below the standfirst. Real photograph.",
    },
    {
      key: "history",
      title: "History",
      pillar: "explore",
      pages: 2,
      words: "1 000-1 500",
      defaultLayout: "hero-opener",
    },
    {
      key: "big-idea-1",
      title: "The Big Idea",
      pillar: "think",
      pages: 2,
      words: "1 000-1 500",
      defaultLayout: "hero-opener",
      notes: "Two per edition.",
    },
    {
      key: "big-idea-2",
      title: "The Big Idea",
      pillar: "think",
      pages: 2,
      words: "1 000-1 500",
      defaultLayout: "hero-opener",
    },
    {
      key: "roam",
      title: "Roam",
      pillar: "roam",
      pages: 2,
      words: "1 000-1 500",
      defaultLayout: "hero-opener",
      notes: "Monthly series. Kruger camps run July to December 2026.",
    },
    {
      key: "kitchen",
      title: "Kitchen",
      pillar: "gather",
      pages: 2,
      words: "300-500 plus recipe",
      defaultLayout: "hero-opener",
      notes: "Origin story plus recipe card. Moxie Tip at the end.",
    },
    {
      key: "book-review",
      title: "Book Review",
      pillar: "discover",
      pages: 1,
      words: "200-300",
      defaultLayout: "band-opener",
      notes: "Warm recommendation only. Connects to the edition theme.",
    },
    {
      key: "sa-personality",
      title: "SA Personality",
      pillar: "personality",
      pages: 2,
      words: "800-1 200",
      defaultLayout: "hero-opener",
      notes: "Real photograph. Offered to the subject for review before publishing.",
    },
    {
      key: "word-of-the-month",
      title: "Word of the Month",
      pillar: "believe",
      pages: 1,
      words: "400-600",
      defaultLayout: "band-opener",
      notes: "Standing 365 extract. Teal hero band and teal left margin rule.",
    },
    {
      key: "puzzles",
      title: "Family Puzzle Pages",
      pillar: "play",
      pages: 1,
      defaultLayout: "list",
      notes: "Answers at the bottom.",
    },
    {
      key: "reader-submissions",
      title: "Reader Submissions",
      pillar: "open",
      pages: 1,
      defaultLayout: "band-opener",
      notes: "First name and province only. Afrikaans entries verbatim and unedited.",
    },
    {
      key: "events",
      title: "Events Calendar",
      pillar: "roam",
      pages: 2,
      defaultLayout: "list",
      notes: "Province colour-coded card grid.",
    },
    {
      key: "svc-spread",
      title: "SVC Spread",
      pillar: "savings",
      pages: 2,
      defaultLayout: "list",
      notes: "Teal Smart Value Club palette, never mixed with Moxie's on a page.",
    },
    {
      key: "advertorial",
      title: "Advertorial",
      pillar: "partner",
      pages: 1,
      words: "300-500",
      defaultLayout: "band-opener",
      notes: "Always clearly labelled as a partner story. Two per edition.",
    },
  ],
};

export function pillarFor(key: PillarKey): Pillar {
  const pillar = MOXIE.pillars.find((p) => p.key === key);
  // A missing pillar is a programming error rather than a content problem,
  // so it fails here instead of rendering a page with a blank label bar
  // that nobody notices until it is published.
  if (!pillar) throw new Error(`Unknown Moxie pillar: ${key}`);
  return pillar;
}

// Section 9. Advertisers supply print-ready artwork and use their own brand
// colours; Moxie does not design advertisements. Trim sizes are the page,
// not the text column, because a full page advertisement bleeds.
export const AD_FORMATS = {
  full: { label: "Full page", trim: "210 x 297mm", bleed: "216 x 303mm", widthPct: 100, heightPct: 100 },
  "half-h": { label: "Half page horizontal", trim: "210 x 148.5mm", bleed: "216 x 151.5mm", widthPct: 100, heightPct: 50 },
  "half-v": { label: "Half page vertical", trim: "105 x 297mm", bleed: "108 x 303mm", widthPct: 50, heightPct: 100 },
  quarter: { label: "Quarter page", trim: "105 x 148.5mm", bleed: null, widthPct: 50, heightPct: 50 },
} as const;

export type AdFormat = keyof typeof AD_FORMATS;

export const AD_POSITIONS = {
  OBC: "Outside Back Cover",
  IFC: "Inside Front Cover",
  IBC: "Inside Back Cover",
  ROM: "Run of Magazine",
} as const;

// Standing inventory per edition, from section 9. The flatplan warns when
// an edition does not match it rather than refusing to publish: a month
// with one advertorial is a commercial fact, not a layout error.
export const AD_INVENTORY = {
  advertorial: 2,
  full: 2,
  "half-h": 3,
  quarter: 4,
} as const;
