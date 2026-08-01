// The typeface library.
//
// A publication picks three faces: one for display, one for body, one for
// labels. Moxie's three are the defaults and the reference, per Dewald on
// 1 August 2026, so a publication that changes nothing is Moxie.
//
// Why a curated list rather than "any font you like".
//
// The fonts are self-hosted, generated at build time. That is not a
// preference, it is what makes the twelfth acceptance criterion true: a
// page cannot render identically every time if its type is fetched from
// someone else's server and may or may not arrive, and a PDF export cannot
// embed a face the build has never seen. So the set has to be known when
// the application is built.
//
// Ten families, chosen to cover what a magazine actually needs rather than
// to be a long list: four that can carry a headline, five that can carry
// running text at 12pt for two thousand words, and three condensed faces
// for labels. Some appear in two roles because they genuinely work in both.

export type FontRole = "display" | "body" | "label";

export type FontChoice = {
  key: string;
  /** The CSS variable next/font generates for it, set in the eMag layout. */
  variable: string;
  label: string;
  /** What it is like, in words a publisher rather than a typographer uses. */
  note: string;
  roles: FontRole[];
  /** The fallback stack, for the moment before the font arrives. */
  stack: string;
};

export const FONT_LIBRARY: FontChoice[] = [
  {
    key: "playfair",
    variable: "--font-mx-playfair",
    label: "Playfair Display",
    note: "High contrast and editorial. Moxie's headline face.",
    roles: ["display"],
    stack: "Georgia, serif",
  },
  {
    key: "bodoni",
    variable: "--font-mx-bodoni",
    label: "Bodoni Moda",
    note: "Sharper and more formal than Playfair. Fashion and culture.",
    roles: ["display"],
    stack: "Georgia, serif",
  },
  {
    key: "libre-baskerville",
    variable: "--font-mx-baskerville",
    label: "Libre Baskerville",
    note: "Warm and traditional. Reads as a book rather than a magazine.",
    roles: ["display", "body"],
    stack: "Georgia, serif",
  },
  {
    key: "lora",
    variable: "--font-mx-lora",
    label: "Lora",
    note: "Contemporary, slightly calligraphic. Comfortable at any size.",
    roles: ["display", "body"],
    stack: "Georgia, serif",
  },
  {
    key: "source-serif",
    variable: "--font-mx-source-serif",
    label: "Source Serif 4",
    note: "Even and unshowy over long stretches. Moxie's body face.",
    roles: ["body"],
    stack: "Georgia, serif",
  },
  {
    key: "spectral",
    variable: "--font-mx-spectral",
    label: "Spectral",
    note: "A little narrower, so more words fit a line. Good for long features.",
    roles: ["body"],
    stack: "Georgia, serif",
  },
  {
    key: "eb-garamond",
    variable: "--font-mx-garamond",
    label: "EB Garamond",
    note: "Classical and light on the page. Wants generous line spacing.",
    roles: ["body"],
    stack: "Georgia, serif",
  },
  {
    key: "barlow-condensed",
    variable: "--font-mx-barlow",
    label: "Barlow Condensed",
    note: "Narrow and even. Moxie's face for labels, kickers and the footer.",
    roles: ["label"],
    stack: '"Arial Narrow", sans-serif',
  },
  {
    key: "oswald",
    variable: "--font-mx-oswald",
    label: "Oswald",
    note: "Tighter and heavier. Labels read as louder.",
    roles: ["label"],
    stack: '"Arial Narrow", sans-serif',
  },
  {
    key: "archivo-narrow",
    variable: "--font-mx-archivo",
    label: "Archivo Narrow",
    note: "Plainer and more neutral. Gets out of the way.",
    roles: ["label"],
    stack: '"Arial Narrow", sans-serif',
  },
];

/** Moxie's three, which are also every publication's starting point. */
export const FONT_DEFAULTS: Record<FontRole, string> = {
  display: "playfair",
  body: "source-serif",
  label: "barlow-condensed",
};

/** The CSS custom property the renderer reads for each role. */
export const FONT_TARGET: Record<FontRole, string> = {
  display: "--mx-display",
  body: "--mx-body",
  label: "--mx-label",
};

export function fontsFor(role: FontRole): FontChoice[] {
  return FONT_LIBRARY.filter((f) => f.roles.includes(role));
}

export function fontByKey(key: string | undefined, role: FontRole): FontChoice {
  const found = FONT_LIBRARY.find((f) => f.key === key && f.roles.includes(role));
  if (found) return found;
  // An unknown or wrongly roled key falls back to the default rather than
  // rendering in whatever the browser feels like, which is how a page ends
  // up in Times New Roman with nobody able to say why.
  return FONT_LIBRARY.find((f) => f.key === FONT_DEFAULTS[role])!;
}

/** The value to assign, for example: var(--font-mx-playfair), Georgia, serif */
export function fontValue(choice: FontChoice): string {
  return `var(${choice.variable}), ${choice.stack}`;
}
