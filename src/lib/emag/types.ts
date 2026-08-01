import type { AdFormat, LayoutKey, PillarKey } from "./publication";

// ---------------------------------------------------------------------------
// Body text
// ---------------------------------------------------------------------------

/**
 * Emphasis inside a paragraph, stored as offsets rather than as markup.
 *
 * This looks roundabout and it is deliberate. The handoff's eleventh
 * acceptance criterion is that all body text in the output is byte-identical
 * to what was pasted in, and Dewald is dyslexic: text is approved before it
 * reaches this stage and nothing here may quietly change it.
 *
 * Every other way of carrying bold and italic fails that. Markdown means
 * parsing and re-serialising, so asterisks in the original become emphasis
 * and quotation marks get converted. HTML means escaping, so an ampersand
 * comes back as &amp;. Storing the run of plain text untouched, with the
 * marks recorded as positions beside it, means the string in the database is
 * the string that was pasted, character for character, and can be compared
 * to the source with a straight equality check.
 */
export type Mark = {
  start: number;
  end: number;
  kind: "bold" | "italic";
};

export type RichText = {
  text: string;
  marks?: Mark[];
};

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

/**
 * Everything a template knows how to lay out. Nothing else can be put in an
 * article, which is the point: the editor offers exactly these and so there
 * is no way to author something that breaks a page.
 */
export type Block =
  | { type: "p"; content: RichText }
  | { type: "subhead"; text: string }
  | {
      type: "pullquote";
      content: RichText;
      tone: "orange" | "teal";
      /**
       * Pairs the quote with a picture standing beside it.
       *
       * July page 30 does this and a float cannot: the quote's text is
       * centred against the height of the image next to it, not hung from
       * its top edge. Naming the asset makes the pair explicit, so the
       * renderer is not guessing that a figure followed by a quote was
       * meant to be a pair.
       */
      beside?: { assetId: string; side: "left" | "right"; widthPct?: number };
    }
  | { type: "list"; ordered?: boolean; items: RichText[] }
  | { type: "figure"; assetId: string }
  | { type: "stats"; cells: StatCell[]; accent?: string }
  | { type: "facts"; cells: FactCell[] }
  | { type: "tip"; content: RichText }
  | { type: "writer"; name: string; bio?: RichText; photoAssetId?: string }
  | { type: "rows"; rows: ListRow[] };

/**
 * One column of the four-column fact grid.
 *
 * Device 01, and the reference restricts it to the Cover Story opener,
 * which is why it is a block the publisher inserts rather than something
 * the layout draws automatically.
 */
export type FactCell = {
  kicker: string;
  word: string;
  note?: string;
};

export type StatCell = {
  figure: string;
  label: string;
  note?: string;
};

/** A repeating labelled row: the events calendar, a quiz, a member offer. */
export type ListRow = {
  tag: string;
  tagNote?: string;
  title: string;
  meta?: string;
  body?: RichText;
  link?: string;
};

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

/**
 * An uploaded image and the publisher's decisions about it.
 *
 * Every field here is a control in the editor. None of it is inferred, and
 * no model is asked where a picture should go: the same article with the
 * same settings has to render identically every time, and the only way to
 * promise that is for placement to be data rather than judgement.
 */
export type Asset = {
  id: string;
  src: string;
  alt: string;
  /**
   * The line under the picture, giving it context.
   *
   * Dewald, 1 August 2026: a picture normally carries one, and it is
   * normally italic. The reference's type table sets captions in Barlow
   * Condensed Regular, which is what June and July actually print, so both
   * are offered rather than one being chosen on his behalf.
   */
  caption?: string;
  captionStyle?: "regular" | "italic";
  /**
   * How the picture sits on the page.
   *
   * Dewald, 1 August 2026: "can the editor give it a bit of shape, a shadow
   * or box effect, instead of just this image dump". A photograph dropped
   * flat onto cream has no edge, so it reads as an accident rather than as
   * a placement. A hairline or a soft shadow gives it one.
   *
   * A choice rather than a decision made for him, because a full bleed
   * photograph wants none of it and an inset one usually does.
   */
  finish?: "none" | "rule" | "shadow" | "framed" | "rounded";
  /**
   * What the picture is for.
   *
   * Matches the column in emag_assets, which is what the database will
   * accept. A cover image and a writer's photograph are not placed in the
   * running text and are found by their slot rather than by a block
   * pointing at them.
   */
  slot: "banner" | "inline" | "cover" | "writer";
  /** Which side of the column, for an inline image. */
  side: "left" | "right" | "full";
  /** Whether running text flows around it. */
  wrap: boolean;
  /** Width as a percentage of the text column. Ignored for a banner. */
  widthPct?: number;
  /** Height in millimetres, for a banner. */
  heightMm?: number;
  /** Optional text set over the image, with its own colour. */
  overlay?: { text: string; color: string };
};

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

/**
 * The section label bar, which every editorial page carries.
 *
 * Two labels, and the reference is specific about which is which: the
 * pillar prints on the left in orange with an orange underline, the
 * section title on the right in charcoal.
 */
export type SectionLabelBar = {
  pillar: PillarKey;
  /** The standing section, printed on the right. */
  section: string;
};

/** The masthead block at the top of an article's first page. */
export type Opener = {
  kicker?: string;
  headline: string;
  /** The part of the headline that turns colour. Rendered after `headline`. */
  headlineTurn?: string;
  turnColor?: string;
  standfirst?: RichText;
  standfirstStyle?: "ruled" | "plain";
  /**
   * How big the headline is. The reference gives hero headlines a range of
   * 28 to 36pt, so these are three steps inside it rather than a free
   * number. A publisher who could type a point size would eventually type
   * one that breaks the page.
   */
  scale?: "md" | "lg" | "xl";
  /** For feature-opener: the banner image and how the type sits on it. */
  bannerAssetId?: string;
  bannerType?: "gradient" | "band" | "top";
  /**
   * How hard to darken the photograph under the type. Chosen per opener,
   * because a headline over a bright sky needs a scrim and a headline over
   * a shadow does not. Defaults to "light".
   */
  scrim?: "none" | "light" | "strong";
  credit?: string;
};

/**
 * One finished page.
 *
 * The renderer takes these and draws them. It never decides what goes on a
 * page: that decision was made once, when the article was approved, and
 * frozen. Replaying a frozen list is what makes repeat runs identical.
 */
export type RenderedPage = {
  layout: LayoutKey;
  head: SectionLabelBar;
  /** Assigned by the flatplan, never typed. Absent on the cover. */
  folio?: number;
  opener?: Opener;
  /**
   * Blocks that sit above the masthead.
   *
   * One case needs this and it is a real one: a partner page leads with the
   * advertiser's own supplied artwork and its figures, and only then reaches
   * the headline written in the magazine's voice. July page 13 is built
   * exactly that way. Keeping it as an ordinary block list rather than a
   * special partner template means the same slot works for anything else
   * that has to sit above a headline later.
   */
  preBlocks?: Block[];
  blocks: Block[];
  /** For layout "advert". */
  ad?: { format: AdFormat; artwork?: string; advertiser: string };
  /**
   * The copyfitting squeeze applied to this article, as a fraction.
   *
   * Carried on the page so a published edition is set exactly as it was
   * approved, rather than depending on the article record still saying the
   * same thing months later.
   */
  tighten?: number;
  /**
   * The teaser printed at the base of the contents page. Contents only.
   */
  nextEdition?: { title: string; note?: string };
};

export type ArticlePages = {
  id: string;
  title: string;
  pillar: PillarKey;
  section: string;
  writer?: string;
  pages: RenderedPage[];
  assets: Asset[];
};
