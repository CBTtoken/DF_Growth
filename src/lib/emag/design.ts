import type { CSSProperties } from "react";

// Every design value a publication can change, in one list.
//
// This file is the reason a second magazine is a second row rather than a
// fork of the renderer. The stylesheet holds Moxie's numbers as its
// defaults, but nothing downstream depends on them: the page reads whatever
// the publication says, and where it says nothing the default applies.
//
// The list is data rather than a form, so the settings screen is generated
// from it. Adding a control means adding an entry here and nothing else.
//
// Each entry carries a `standard` as well as a `fallback`. They are usually
// the same, and where they differ the standard is what the publication's own
// design reference specifies. Showing it means a publisher who moves away
// from their own written spec does it deliberately rather than by drift.

export type TokenGroup = "type" | "page" | "colour";

export type DesignToken = {
  key: string;
  /** The CSS custom property the renderer reads. */
  cssVar: string;
  group: TokenGroup;
  /** What a publisher calls this thing. */
  label: string;
  hint?: string;
  unit: "pt" | "mm" | "ratio" | "colour";
  fallback: string | number;
  /** What the publication's own reference specifies, if it does. */
  standard?: string | number;
  min?: number;
  max?: number;
  step?: number;
};

export const DESIGN_TOKENS: DesignToken[] = [
  // ---------------------------------------------------------------- type
  {
    key: "bodySize",
    cssVar: "--mx-body-size",
    group: "type",
    label: "Body text",
    hint: "The size of the running text. Everything else is judged against this.",
    unit: "pt",
    fallback: 12,
    standard: 12,
    min: 8,
    max: 16,
    step: 0.5,
  },
  {
    key: "bodyLeading",
    cssVar: "--mx-body-leading",
    group: "type",
    label: "Line spacing",
    hint: "How far apart the lines of body text sit, as a multiple of its size.",
    unit: "ratio",
    fallback: 1.3333,
    standard: 1.3333,
    min: 1.1,
    max: 1.8,
    step: 0.0167,
  },
  {
    key: "headlineSize",
    cssVar: "--mx-headline-size",
    group: "type",
    label: "Headline",
    hint: "The headline on an article's first page.",
    unit: "pt",
    fallback: 30,
    standard: 30,
    min: 18,
    max: 60,
    step: 1,
  },
  {
    key: "standfirstSize",
    cssVar: "--mx-standfirst-size",
    group: "type",
    label: "Standfirst",
    hint: "The introduction under the headline.",
    unit: "pt",
    fallback: 12,
    standard: 12,
    min: 9,
    max: 20,
    step: 0.5,
  },
  {
    key: "subheadSize",
    cssVar: "--mx-subhead-size",
    group: "type",
    label: "Subheading",
    unit: "pt",
    fallback: 11.5,
    standard: 11.5,
    min: 8,
    max: 18,
    step: 0.5,
  },
  {
    key: "kickerSize",
    cssVar: "--mx-kicker-size",
    group: "type",
    label: "Kicker",
    hint: "The small label above a headline.",
    unit: "pt",
    fallback: 9.5,
    standard: 9.5,
    min: 7,
    max: 14,
    step: 0.5,
  },
  {
    key: "quoteSize",
    cssVar: "--mx-quote-size",
    group: "type",
    label: "Pull quote",
    unit: "pt",
    fallback: 14,
    standard: 14,
    min: 10,
    max: 24,
    step: 0.5,
  },
  {
    key: "captionSize",
    cssVar: "--mx-caption-size",
    group: "type",
    label: "Picture caption",
    hint: "The line of context under a photograph.",
    unit: "pt",
    fallback: 9.5,
    standard: 9.5,
    min: 7,
    max: 14,
    step: 0.5,
  },
  {
    key: "labelBarSize",
    cssVar: "--mx-labelbar-size",
    group: "type",
    label: "Section label bar",
    hint: "The pillar and section names across the top of every page.",
    unit: "pt",
    fallback: 9.5,
    standard: 9.5,
    min: 7,
    max: 14,
    step: 0.5,
  },
  {
    key: "footerSize",
    cssVar: "--mx-footer-size",
    group: "type",
    label: "Footer",
    hint: "The site name and page number along the bottom.",
    unit: "pt",
    fallback: 9,
    standard: 9,
    min: 6,
    max: 14,
    step: 0.5,
  },

  // ---------------------------------------------------------------- page
  {
    key: "margin",
    cssVar: "--mx-text-l",
    group: "page",
    label: "Page margin",
    hint: "The white space around the text, on every side.",
    unit: "mm",
    fallback: 14,
    standard: 14,
    min: 8,
    max: 30,
    step: 1,
  },
  {
    key: "heroHeight",
    cssVar: "--mx-hero-h",
    group: "page",
    label: "Hero band height",
    hint: "How deep the coloured band carrying a headline is.",
    unit: "mm",
    fallback: 52,
    standard: 52,
    min: 20,
    max: 120,
    step: 1,
  },
  {
    key: "footerHeight",
    cssVar: "--mx-foot-h",
    group: "page",
    label: "Footer height",
    unit: "mm",
    fallback: 10,
    standard: 10,
    min: 6,
    max: 20,
    step: 1,
  },
  {
    key: "topRule",
    cssVar: "--mx-topbar-h",
    group: "page",
    label: "Top rule",
    hint: "The coloured bar across the very top of a page.",
    unit: "mm",
    fallback: 4,
    standard: 4,
    min: 0,
    max: 12,
    step: 0.5,
  },
  {
    key: "paraGap",
    cssVar: "--mx-para-gap",
    group: "page",
    label: "Gap between paragraphs",
    unit: "mm",
    fallback: 1.9,
    min: 0,
    max: 8,
    step: 0.1,
  },
  {
    key: "sectionGap",
    cssVar: "--mx-gap-section",
    group: "page",
    label: "Gap before a Moxie Tip or a writer credit",
    hint: "The space that opens before something that closes an article.",
    unit: "mm",
    fallback: 8,
    standard: 8,
    min: 0,
    max: 20,
    step: 0.5,
  },
  {
    key: "subheadAbove",
    cssVar: "--mx-gap-subhead-above",
    group: "page",
    label: "Space above a subheading",
    hint: "Measured as a reader sees it, not added to the paragraph spacing above.",
    unit: "mm",
    fallback: 8,
    standard: 8,
    min: 0,
    max: 20,
    step: 0.5,
  },
  {
    key: "subheadBelow",
    cssVar: "--mx-gap-subhead-below",
    group: "page",
    label: "Space below a subheading",
    unit: "mm",
    fallback: 4,
    standard: 4,
    min: 0,
    max: 16,
    step: 0.5,
  },
  {
    key: "standfirstPad",
    cssVar: "--mx-gap-min",
    group: "page",
    label: "Space around the standfirst",
    hint: "Between the standfirst's hairlines and the text on either side of it.",
    unit: "mm",
    fallback: 4,
    standard: 4,
    min: 0,
    max: 14,
    step: 0.5,
  },

  // -------------------------------------------------------------- colour
  { key: "colourPrimary", cssVar: "--mx-orange", group: "colour", label: "Primary", hint: "Kickers, rules, subheadings, the accent word in a headline.", unit: "colour", fallback: "#c85a1e", standard: "#c85a1e" },
  { key: "colourSecondary", cssVar: "--mx-teal", group: "colour", label: "Secondary", hint: "Tip boxes, teaser panels, and anything belonging to a parent brand.", unit: "colour", fallback: "#0b6e6e", standard: "#0b6e6e" },
  { key: "colourDark", cssVar: "--mx-charcoal", group: "colour", label: "Dark", hint: "Hero bands, the footer, and body text.", unit: "colour", fallback: "#1e2020", standard: "#1e2020" },
  { key: "colourPage", cssVar: "--mx-cream", group: "colour", label: "Page", hint: "The paper colour.", unit: "colour", fallback: "#f7f3ee", standard: "#f7f3ee" },
  { key: "colourRule", cssVar: "--mx-border", group: "colour", label: "Hairlines", unit: "colour", fallback: "#e0d8d0", standard: "#e0d8d0" },
  { key: "colourCaption", cssVar: "--mx-caption", group: "colour", label: "Caption text", unit: "colour", fallback: "#888888", standard: "#888888" },
];

export type DesignSettings = Record<string, string | number>;

/**
 * Turns a publication's settings into the CSS custom properties the page
 * reads.
 *
 * Anything unset is simply absent, so the stylesheet's own default applies.
 * That matters: a publication that has never opened the settings screen
 * must render exactly as it did before the screen existed.
 */
export function designStyle(settings: DesignSettings | null | undefined): CSSProperties {
  const style: Record<string, string> = {};
  if (!settings) return style as CSSProperties;

  for (const token of DESIGN_TOKENS) {
    const value = settings[token.key];
    if (value === undefined || value === null || value === "") continue;

    if (token.unit === "colour") {
      style[token.cssVar] = String(value);
    } else if (token.unit === "ratio") {
      style[token.cssVar] = String(value);
    } else {
      style[token.cssVar] = `${value}${token.unit}`;
    }
  }

  // The margin is one control but two properties, because a page that is
  // 14mm in on the left and something else on the right is not a thing any
  // publisher wants and is an easy way to produce a broken page.
  if (settings.margin !== undefined && settings.margin !== "") {
    style["--mx-text-l"] = `${settings.margin}mm`;
    style["--mx-text-r"] = `${settings.margin}mm`;
  }

  return style as CSSProperties;
}

/** The value in force, whether the publisher set it or not. */
export function effective(settings: DesignSettings | null | undefined, token: DesignToken) {
  const value = settings?.[token.key];
  return value === undefined || value === null || value === "" ? token.fallback : value;
}
