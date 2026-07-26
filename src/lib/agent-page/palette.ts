import { shade, ensureContrast } from "@/lib/color";

// Agent Programme Phase 1 Sec 1.4: the agent picks one accent colour and
// the whole page palette is derived from it programmatically, with a hard
// contrast floor so a pale pick can never ship grey-on-white text.
//
// The contrast maths itself is lib/color.ts's `ensureContrast`, already
// used by every client landing template for exactly this problem (a client
// picking #fbff0a and getting invisible text). Reusing it rather than
// writing a second WCAG implementation matters here specifically: two
// contrast floors that disagree is worse than one that is occasionally
// conservative, and this file would otherwise be the only other place in
// the codebase that knows what "readable" means.
//
// Everything here is pure and synchronous, so the same palette is computed
// identically in the page, in the OG image route, and in the admin
// preview, with no chance of the three drifting apart.

// The app's own --ink, the dark surface every dark-mode section sits on.
const INK = "#0b1220";

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// shade() only mixes toward pure white or pure black, which covers every
// light-mode derivation below. The dark-mode surfaces need a mix toward
// --ink specifically (a blue-black, not neutral black), so those two get
// this instead.
function mixToward(hex: string, target: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [tr, tg, tb] = hexToRgb(target);
  const part = (from: number, to: number) =>
    Math.round(from + (to - from) * amount)
      .toString(16)
      .padStart(2, "0");
  return `#${part(r, tr)}${part(g, tg)}${part(b, tb)}`;
}

// Needed by the OG card, which has to lay a translucent accent scrim over
// a photo. Satori supports rgba() but not colour-mix or opacity on a
// background, so the alpha has to be baked into the colour string.
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export type AgentPalette = {
  /** Exactly what the agent picked. Only used where nothing sits on top. */
  accent: string;
  /** Full-bleed hero field. Always dark enough to carry white text. */
  heroBg: string;
  /** A deeper stop of the same hue, for hero depth and the badge field. */
  heroDeep: string;
  /** Accent adjusted to stay readable as text on white. */
  accentOnLight: string;
  /** Accent adjusted to stay readable as text on the dark ink surface. */
  accentOnDark: string;
  /** Barely-there accent wash for light-mode section backgrounds. */
  tint: string;
  /** The same idea against the dark surface. */
  tintDark: string;
  /** Hairline borders, light and dark mode. */
  border: string;
  borderDark: string;
  /** The two stops the portrait's duotone maps shadows and highlights to. */
  duotoneShadow: string;
  duotoneHighlight: string;
};

export const DEFAULT_ACCENT = "#1081b8";

export function isValidAccent(hex: string): boolean {
  return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex.trim());
}

export function buildAgentPalette(rawAccent: string): AgentPalette {
  const accent = isValidAccent(rawAccent)
    ? rawAccent.trim().startsWith("#")
      ? rawAccent.trim()
      : `#${rawAccent.trim()}`
    : DEFAULT_ACCENT;

  // Contrast is symmetric, so one adjusted value serves both uses: a colour
  // that clears 4.5:1 against white is readable as text on white AND dark
  // enough to carry white text as a background.
  const readableOnWhite = ensureContrast(accent, "#ffffff");

  // The hero carries white text over a full-bleed field, so the field is
  // darkened until white clears the floor rather than the text flipping to
  // dark on a pale field. Keeping the text white on every accent is what
  // holds the "quiet and confident" direction together across ten
  // different picks, where flipping per colour would make every agent page
  // look like a different product. Darkening further only raises the ratio,
  // so this extra step can never fall back below the floor.
  const heroBg = shade(readableOnWhite, -0.12);

  return {
    accent,
    heroBg,
    heroDeep: shade(heroBg, -0.35),
    accentOnLight: readableOnWhite,
    accentOnDark: ensureContrast(accent, INK),
    tint: shade(accent, 0.94),
    tintDark: mixToward(accent, INK, 0.88),
    border: shade(accent, 0.78),
    borderDark: mixToward(accent, INK, 0.7),
    // Shadows land on a deep version of the hue and highlights on a pale
    // one. Both stops sit further apart than anything else on the page so
    // faces keep their modelling instead of flattening into one block of
    // colour, which is what makes a casual phone snapshot read as a chosen
    // treatment rather than an unedited photo.
    duotoneShadow: shade(accent, -0.62),
    duotoneHighlight: shade(accent, 0.88),
  };
}

// Sec 1.4: "Offer a curated set of eight to ten strong options plus a
// custom picker." Ten, chosen to be clearly distinguishable from each
// other at a glance in the picker, and all strong enough that the contrast
// floor above barely has to touch them.
export const CURATED_ACCENTS: { name: string; hex: string }[] = [
  { name: "Flyer Blue", hex: "#1081b8" },
  { name: "Deep Navy", hex: "#1d3a5f" },
  { name: "Teal", hex: "#0e7c7b" },
  { name: "Forest", hex: "#2f6b3a" },
  { name: "Amber", hex: "#e8821a" },
  { name: "Rust", hex: "#b4451f" },
  { name: "Crimson", hex: "#a8202e" },
  { name: "Plum", hex: "#6b2d5c" },
  { name: "Indigo", hex: "#40408c" },
  { name: "Graphite", hex: "#3a4148" },
];
