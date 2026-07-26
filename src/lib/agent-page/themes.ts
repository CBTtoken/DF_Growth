import { ensureContrast, shade } from "@/lib/color";

// Agent page v3: "Four curated themes, no free colour picker. Each fully
// designed and contrast-checked. The agent picks a theme, not a colour."
//
// v1 derived a whole palette from any hex an agent typed, which meant every
// combination was generated and none was actually designed. Four fixed
// themes is the better trade: each one is chosen deliberately, they are
// distinguishable at a glance in the picker, and none of them can produce
// the muddy result an arbitrary hex sometimes did.
//
// The contrast floor stays anyway. Not because these four need rescuing,
// they were picked to clear it comfortably, but because a fifth theme added
// later without checking would otherwise ship broken and nothing would
// catch it. ensureContrast is the same helper every client landing template
// already uses, so there is still exactly one definition of readable.

export type AgentThemeId = "slate" | "forest" | "clay" | "plum";

export type AgentTheme = {
  id: AgentThemeId;
  /** Shown in the picker. */
  name: string;
  /** Full-bleed hero field. White text always sits on this. */
  heroBg: string;
  /** Deeper stop of the same hue, for the monogram field. */
  heroDeep: string;
  /** Barely-there wash for the hero section and the inset panel. */
  tint: string;
  /** Hairline dividers and panel edges. */
  border: string;
  /** The accent used as text on white. Contrast-checked. */
  accentOnLight: string;
  /** The two stops the portrait duotone maps shadows and highlights to. */
  duotoneShadow: string;
  duotoneHighlight: string;
};

// Base hue per theme. Everything else is derived from it, so a theme is one
// decision rather than eight numbers to keep in sync.
const BASES: { id: AgentThemeId; name: string; base: string }[] = [
  { id: "slate", name: "Slate", base: "#22456b" },
  { id: "forest", name: "Forest", base: "#245c46" },
  { id: "clay", name: "Clay", base: "#9c4a2a" },
  { id: "plum", name: "Plum", base: "#6b2d5c" },
];

function build({ id, name, base }: { id: AgentThemeId; name: string; base: string }): AgentTheme {
  // Contrast is symmetric, so one adjusted value serves both uses: a colour
  // that clears 4.5:1 against white reads as text on white and is dark
  // enough to carry white text as a background.
  const readableOnWhite = ensureContrast(base, "#ffffff");

  return {
    id,
    name,
    heroBg: shade(readableOnWhite, -0.08),
    heroDeep: shade(readableOnWhite, -0.4),
    tint: shade(base, 0.95),
    border: shade(base, 0.82),
    accentOnLight: readableOnWhite,
    duotoneShadow: shade(base, -0.6),
    duotoneHighlight: shade(base, 0.88),
  };
}

export const AGENT_THEMES: Record<AgentThemeId, AgentTheme> = BASES.reduce(
  (acc, spec) => ({ ...acc, [spec.id]: build(spec) }),
  {} as Record<AgentThemeId, AgentTheme>
);

export const AGENT_THEME_LIST: AgentTheme[] = BASES.map((spec) => AGENT_THEMES[spec.id]);

export const DEFAULT_AGENT_THEME: AgentThemeId = "slate";

export function resolveAgentTheme(id: string | null | undefined): AgentTheme {
  return AGENT_THEMES[(id as AgentThemeId) ?? DEFAULT_AGENT_THEME] ?? AGENT_THEMES[DEFAULT_AGENT_THEME];
}
