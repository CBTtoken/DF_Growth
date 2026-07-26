import { ensureContrast, shade } from "@/lib/color";

// Agent page design, ported from the Bolt design Dewald supplied
// (docs/project-bolt-sb1-skmsgszg.zip).
//
// That design is built on two colour families: a fixed warm neutral (sand)
// that carries the page's character, and one accent ramp (forest in the
// original) used for every button, badge, number and dark section. Only the
// accent is the agent's to choose, which is the right split: the warmth is
// the design, the accent is the person.
//
// So this generates a full ramp from one hex rather than offering fixed
// themes. Dewald's ask was that an agent picks their own colour, including
// DigitalFlyer's own brand blue, and the Bolt design's forest and every
// other choice have to land in the same slots for the layout to hold.

/** The design's warm neutral. Fixed, never agent-editable. */
export const SAND = {
  50: "#fbf8f3",
  100: "#f5efe4",
  200: "#ece0c9",
  300: "#dec9a1",
  400: "#ccab73",
} as const;

/** The design's near-black. Warm, not neutral, which is what stops the page feeling clinical. */
export const INK = "#1a1714";

export type AgentAccent = {
  /** Exactly what was picked. */
  base: string;
  /** Pale tints, for dark-section chips and light strokes. */
  200: string;
  300: string;
  /** Mid, for small marks and dividers. */
  500: string;
  /** The button colour. White text sits on this, so it clears 4.5:1. */
  600: string;
  /** Hover, and the resolution line. */
  700: string;
  800: string;
  /** The dark section behind the outcomes and portfolio. */
  950: string;
};

export const DEFAULT_ACCENT = "#2f6a44";

export function isValidAccent(hex: string): boolean {
  return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex.trim());
}

function normalise(hex: string): string {
  const trimmed = hex.trim();
  if (!isValidAccent(trimmed)) return DEFAULT_ACCENT;
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

export function buildAgentAccent(rawAccent: string): AgentAccent {
  const base = normalise(rawAccent);

  // The 600 stop is load-bearing: it is the button fill, and white text
  // sits on it in six places. ensureContrast is the same helper every
  // client landing template uses, so there is one definition of readable in
  // the codebase and a pale pick cannot ship an unreadable button.
  //
  // Contrast is symmetric, so the value that clears 4.5:1 against white is
  // also dark enough to carry white text.
  const six = ensureContrast(base, "#ffffff");

  return {
    base,
    200: shade(six, 0.72),
    300: shade(six, 0.55),
    500: shade(six, 0.18),
    600: six,
    700: shade(six, -0.16),
    800: shade(six, -0.32),
    // The dark section. Deep enough that white body copy sits comfortably
    // on it whatever the hue, which a mid-tone accent would not manage.
    950: shade(six, -0.62),
  };
}

// Offered in the picker alongside a free colour input. The first is the
// Bolt design's own forest, so the default page is exactly the design as
// supplied; the second is the DigitalFlyer brand blue, since Dewald asked
// that an agent be able to run our colours rather than their own.
export const CURATED_ACCENTS: { name: string; hex: string }[] = [
  { name: "Forest", hex: "#2f6a44" },
  { name: "Flyer Blue", hex: "#1081b8" },
  { name: "Deep Navy", hex: "#1d3a5f" },
  { name: "Teal", hex: "#0e7c7b" },
  { name: "Plum", hex: "#6b2d5c" },
  { name: "Clay", hex: "#9c4a2a" },
  { name: "Crimson", hex: "#a8202e" },
  { name: "Graphite", hex: "#3a4148" },
];
