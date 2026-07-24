import { Playfair_Display, Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import type { TemplateId } from "./registry";

// UI/UX Design Pass, Part 2 (docs/GROWTH_DESIGN_SKILLS_AND_TEMPLATE_DIVERSITY_CLAUDE.md
// Sec 3). Mirrors the existing hero-variant pattern (8 hero components
// keyed by id in registry.ts) — extends the same idea to a full per-
// template "design anchor" covering typography, card treatment, spacing,
// and (for a bounded set of sections) real structural variation. A token/
// recipe system: 5 card recipes, 4 eyebrow styles, 3 spacing densities, 4
// font keys, reused across the 10 anchors — never one-off per anchor.
//
// next/font requires static, module-scope call sites — these three fonts
// are the FIXED set the whole anchor system will ever use, not one per
// anchor. Only ONE of these is actually applied per page (see
// HEADING_FONT_VARIABLE + how it's consumed in ClientLandingPageView.tsx)
// — layout.tsx's own comment already documents a real LCP regression this
// codebase hit once from a font variable that was defined but never
// applied to rendered text, still getting eagerly preloaded regardless.
// Applying all three unconditionally to every templated page would
// reintroduce exactly that bug for the two-thirds of anchors that don't
// use them.
const serifEditorial = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-anchor-serif",
});
const displayCondensed = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-anchor-display",
});
const monoTechnical = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-anchor-mono",
});

export type HeadingFontKey = "sans-default" | "serif-editorial" | "display-condensed" | "mono-technical";

// The single CSS custom property each key needs — applied to <main> only
// for the one key a given anchor actually uses (sans-default needs none,
// it inherits the body's existing --font-geist-sans).
export const HEADING_FONT_VARIABLE: Record<HeadingFontKey, string> = {
  "sans-default": "",
  "serif-editorial": serifEditorial.variable,
  "display-condensed": displayCondensed.variable,
  "mono-technical": monoTechnical.variable,
};

// The Tailwind arbitrary-value class each heading in a section applies —
// same `font-[family-name:var(--font-x)]` pattern already proven safe by
// the custom pages (Buffelskop, Standing 365, Helplift).
export const HEADING_FONT_CLASS: Record<HeadingFontKey, string> = {
  "sans-default": "",
  "serif-editorial": "font-[family-name:var(--font-anchor-serif)]",
  "display-condensed": "font-[family-name:var(--font-anchor-display)]",
  "mono-technical": "font-[family-name:var(--font-anchor-mono)]",
};

export type CardRecipeId = "flat-border" | "soft-shadow" | "outlined-accent" | "editorial-rule" | "dark-panel";

// "soft-shadow" is today's existing default card look, unchanged — every
// other recipe is a genuinely different container treatment. "dark-panel"
// is self-contained (its own dark bg/border/text) rather than depending on
// the page-wide dark surface work landing in Chunk 2 — a dark accent card
// on an otherwise light section is a legitimate pattern on its own, and
// becomes the seed dark-mode already has once Chunk 2d commits the whole
// section surface to dark too.
// "dark-panel" is a premium glass-panel treatment (translucent bg, hairline
// white border, subtle blur) rather than a flat slab — only "dark-mode"'s
// anchor uses this recipe, so this is an isolated change.
export const CARD_RECIPE_CLASS: Record<CardRecipeId, string> = {
  "flat-border": "rounded-xl border border-gray-200 bg-white",
  "soft-shadow": "rounded-2xl border border-gray-100 bg-white shadow-sm",
  "outlined-accent": "rounded-2xl border-2 border-brand/30 bg-white",
  "editorial-rule": "border-l-4 border-brand/60 bg-transparent pl-5",
  "dark-panel": "rounded-2xl border border-white/10 bg-white/5 text-white backdrop-blur-sm",
};

export type EyebrowStyle = "mono-numbered" | "pill-badge" | "rule-line" | "plain-caps";

// "mono-numbered" is the exact byte-for-byte class every section component
// uses today (font-mono text-sm font-semibold uppercase tracking-[0.2em]
// sm:text-base) — kept as one of the four real options, not just a fallback.
export const EYEBROW_STYLE_CLASS: Record<EyebrowStyle, string> = {
  "mono-numbered": "font-mono text-sm font-semibold uppercase tracking-[0.2em] sm:text-base",
  "pill-badge": "inline-flex rounded-full bg-brand/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand",
  "rule-line": "inline-block border-b border-gray-200 pb-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-400",
  "plain-caps": "text-xs font-bold uppercase tracking-widest text-gray-400",
};

export type SpacingDensity = "airy" | "standard" | "tight";

// "standard" is today's exact existing section padding (py-16 sm:py-24),
// unchanged — "airy" and "tight" are genuinely different rhythms.
export const SPACING_CLASS: Record<SpacingDensity, string> = {
  airy: "py-20 sm:py-28",
  standard: "py-16 sm:py-24",
  tight: "py-12 sm:py-16",
};

// Chunk 2d: "light-default" keeps every component's existing bg-white/
// bg-gray-50 alternation and gray-900/gray-600 text untouched — "dark"
// commits the whole section (not just its cards) to one consistent dark
// tone. One dark tone rather than trying to preserve the light rhythm's
// white/gray-50 alternation in dark form — simpler, and the section's own
// border/card recipe already provides enough visual separation.
export type SectionSurface = "light-default" | "dark";

export const SURFACE_SECTION_CLASS: Record<SectionSurface, string> = {
  "light-default": "",
  dark: "bg-ink",
};
export const SURFACE_BORDER_CLASS: Record<SectionSurface, string> = {
  "light-default": "border-gray-100",
  dark: "border-gray-800",
};
export const SURFACE_HEADING_CLASS: Record<SectionSurface, string> = {
  "light-default": "text-gray-900",
  dark: "text-white",
};
export const SURFACE_BODY_CLASS: Record<SectionSurface, string> = {
  "light-default": "text-gray-600",
  dark: "text-gray-300",
};

export interface TemplateAnchor {
  id: TemplateId;
  headingFont: HeadingFontKey;
  cardRecipe: CardRecipeId;
  eyebrowStyle: EyebrowStyle;
  spacing: SpacingDensity;
  sectionSurface: SectionSurface;
  // Structural overrides — undefined means "use each component's existing
  // default JSX shape."
  packagesLayout?: "grid-cards" | "list-rows" | "spotlight-feature" | "ambient-stack";
  reviewsLayout?: "list-detail" | "hero-stat";
  servicesLayout?: "icon-grid" | "numbered-rows" | "checklist-compact" | "spotlight-tiles";
  // Dark Mode pilot rebuild: TrustBadges previously had no layout axis at
  // all (a deliberate earlier decision to keep the axis count bounded) —
  // reversed here because direct client feedback named structural sameness
  // as the actual problem. "strip" is today's exact existing horizontal-
  // scroll card treatment, kept byte-identical as the default.
  trustLayout?: "strip" | "spotlight-quote";
}

export const anchors: Record<TemplateId, TemplateAnchor> = {
  "single-action": {
    id: "single-action",
    headingFont: "sans-default",
    cardRecipe: "editorial-rule",
    eyebrowStyle: "plain-caps",
    spacing: "airy",
    sectionSurface: "light-default",
  },
  "left-split": {
    id: "left-split",
    headingFont: "sans-default",
    cardRecipe: "soft-shadow",
    eyebrowStyle: "plain-caps",
    spacing: "standard",
    sectionSurface: "light-default",
  },
  "feature-grid": {
    id: "feature-grid",
    headingFont: "display-condensed",
    cardRecipe: "flat-border",
    eyebrowStyle: "mono-numbered",
    spacing: "tight",
    sectionSurface: "light-default",
    servicesLayout: "checklist-compact",
    packagesLayout: "list-rows",
  },
  storyteller: {
    id: "storyteller",
    headingFont: "serif-editorial",
    cardRecipe: "editorial-rule",
    eyebrowStyle: "rule-line",
    spacing: "airy",
    sectionSurface: "light-default",
  },
  "dark-mode": {
    id: "dark-mode",
    headingFont: "display-condensed",
    cardRecipe: "dark-panel",
    eyebrowStyle: "pill-badge",
    spacing: "standard",
    sectionSurface: "dark",
    trustLayout: "spotlight-quote",
    servicesLayout: "spotlight-tiles",
    packagesLayout: "ambient-stack",
    reviewsLayout: "hero-stat",
  },
  "social-proof": {
    id: "social-proof",
    headingFont: "sans-default",
    cardRecipe: "soft-shadow",
    eyebrowStyle: "pill-badge",
    spacing: "standard",
    sectionSurface: "light-default",
    reviewsLayout: "hero-stat",
  },
  "step-by-step": {
    id: "step-by-step",
    headingFont: "display-condensed",
    cardRecipe: "outlined-accent",
    eyebrowStyle: "pill-badge",
    spacing: "standard",
    sectionSurface: "light-default",
    servicesLayout: "numbered-rows",
  },
  "vibrant-geo": {
    id: "vibrant-geo",
    headingFont: "display-condensed",
    cardRecipe: "outlined-accent",
    eyebrowStyle: "pill-badge",
    spacing: "standard",
    sectionSurface: "light-default",
  },
  "multi-product": {
    id: "multi-product",
    headingFont: "sans-default",
    cardRecipe: "soft-shadow",
    eyebrowStyle: "mono-numbered",
    spacing: "standard",
    sectionSurface: "light-default",
    packagesLayout: "spotlight-feature",
  },
  "app-dashboard": {
    id: "app-dashboard",
    headingFont: "mono-technical",
    cardRecipe: "flat-border",
    eyebrowStyle: "plain-caps",
    spacing: "tight",
    sectionSurface: "light-default",
    servicesLayout: "checklist-compact",
  },
};

export function getAnchor(id: TemplateId): TemplateAnchor {
  return anchors[id];
}
