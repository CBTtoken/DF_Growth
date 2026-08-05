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

export type CardRecipeId = "flat-border" | "soft-shadow" | "outlined-accent" | "editorial-rule" | "dark-panel" | "steel-plate" | "copper-seam" | "invitation";

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
  // Fieldwork build: a hard offset shadow instead of a blur — the soft
  // recipes read "friendly SaaS", this one reads like a stamped plate. The
  // shadow colour is a fixed light steel so it stays subtle on the light
  // surfaces this recipe is used on; nothing about it depends on the
  // member's own colours.
  "steel-plate": "rounded-md border border-gray-300 bg-white shadow-[4px_4px_0_0_#e2e8f0]",
  // Copperline build: a warm card with a soldered top seam. The seam is the
  // theme's fixed copper, not the member's colour, the same way steel-plate
  // fixes its steel: it is the theme's own material signature, and it reads
  // correct whatever brand colours the member chose.
  "copper-seam": "rounded-xl border border-gray-200 border-t-4 border-t-[#b87333] bg-white shadow-sm",
  // Marquee build: a double-ruled frame, the way a printed invitation is
  // bordered. Square corners on purpose — every soft recipe rounds them,
  // and the crisp corner is half of what makes this read stationery rather
  // than SaaS. Neutral greys like steel-plate's steel: it is the theme's
  // material, not the member's palette.
  invitation: "rounded-none border-[3px] border-double border-gray-300 bg-white shadow-sm",
};

export type EyebrowStyle = "mono-numbered" | "pill-badge" | "rule-line" | "plain-caps" | "stencil-tag" | "junction-tag";

// "mono-numbered" is the exact byte-for-byte class every section component
// uses today (font-mono text-sm font-semibold uppercase tracking-[0.2em]
// sm:text-base) — kept as one of the four real options, not just a fallback.
export const EYEBROW_STYLE_CLASS: Record<EyebrowStyle, string> = {
  "mono-numbered": "font-mono text-sm font-semibold uppercase tracking-[0.2em] sm:text-base",
  "pill-badge": "inline-flex rounded-full bg-brand/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand",
  "rule-line": "inline-block border-b border-gray-200 pb-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-400",
  "plain-caps": "text-xs font-bold uppercase tracking-widest text-gray-400",
  // Fieldwork build: reads like a stencilled label on a crate — a thick
  // rule in the accent colour (border-current picks up the eyebrow's
  // style={{ color }}) hard against the text, no pill, no lowercase.
  // Sized up after Dewald's live review (3 Aug): at text-xs with 0.28em
  // tracking the section labels were genuinely hard to read.
  "stencil-tag": "inline-flex items-center border-l-4 border-current pl-3 font-mono text-sm font-bold uppercase tracking-[0.18em] sm:text-base",
  // Copperline build: a pipe-junction dot ahead of the label — a small
  // ring in the eyebrow's own colour, like a fitting on a line. Reads
  // hand-made rather than stencilled, which is the whole difference in
  // register between this theme and Fieldwork.
  "junction-tag": "inline-flex items-center gap-2.5 text-sm font-bold uppercase tracking-[0.18em] before:size-3 before:rounded-full before:border-[3px] before:border-current before:content-[''] sm:text-base",
};

export type SpacingDensity = "airy" | "standard" | "tight";

// Section vertical rhythm. Tightened 2026-07-25 (Dewald: templates had too
// much white space between sections) — roughly a quarter less top/bottom
// padding across all three densities, while keeping "airy" > "standard" >
// "tight" as genuinely different rhythms.
export const SPACING_CLASS: Record<SpacingDensity, string> = {
  airy: "py-14 sm:py-20",
  standard: "py-12 sm:py-16",
  tight: "py-8 sm:py-12",
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
  servicesLayout?: "icon-grid" | "numbered-rows" | "checklist-compact" | "spotlight-tiles" | "work-index" | "junction-line";
  // Dark Mode pilot rebuild: TrustBadges previously had no layout axis at
  // all (a deliberate earlier decision to keep the axis count bounded) —
  // reversed here because direct client feedback named structural sameness
  // as the actual problem. "strip" is today's exact existing horizontal-
  // scroll card treatment, kept byte-identical as the default.
  trustLayout?: "strip" | "spotlight-quote";
  // Fieldwork build: three more sections gain a structural axis, for the
  // same reason trustLayout got one — the WeCare build's direct feedback
  // was that below the hero the page still read like every other template,
  // and tokens alone (font, card, eyebrow) can't fix structural sameness.
  // As with every other axis, undefined means "existing default JSX".
  aboutLayout?: "split-grid" | "statement";
  howItWorksLayout?: "cards" | "jobline";
  locationLayout?: "map-split" | "coverage-panel" | "home-base";
  galleryLayout?: "square-grid" | "evidence-board" | "job-wall" | "lookbook";
  // Marquee build, after Dewald's live review: an events enquiry needs the
  // questions an events business actually asks (event type, date, guests,
  // venue), which the standard four-field form does not carry. All extra
  // fields stay optional and ride into the lead's message, so no schema or
  // dashboard change is involved and every other template is untouched.
  leadFormVariant?: "event-enquiry";
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
    // Dewald's live call after seeing it: dark hero + light body reads
    // better than committing the whole page to dark — the contrast between
    // the two was the actual good part of the original design, not
    // something to remove. cardRecipe reverts to a light-safe recipe since
    // "dark-panel" (translucent white-on-dark) is unreadable on a light
    // section; the new structural layouts (spotlight-quote/spotlight-tiles/
    // ambient-stack) stay — those were never dependent on a dark surface.
    cardRecipe: "soft-shadow",
    eyebrowStyle: "pill-badge",
    spacing: "standard",
    sectionSurface: "light-default",
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
  // A combination none of the ten above use: the editorial serif paired with
  // soft cards, pill eyebrows and airy spacing. Storyteller is the other
  // serif anchor and deliberately goes the opposite way, with hard editorial
  // rules and no shadow, so the two do not read as the same page.
  "dual-offer": {
    id: "dual-offer",
    headingFont: "serif-editorial",
    cardRecipe: "soft-shadow",
    eyebrowStyle: "pill-badge",
    spacing: "standard",
    sectionSurface: "light-default",
    servicesLayout: "numbered-rows",
    packagesLayout: "ambient-stack",
  },
  // Fieldwork: the industrial job-sheet anchor. Display-condensed headings
  // over a mono stencil eyebrow, stamped-plate cards, and — unlike every
  // anchor before it — a structural override on four sections, not just
  // services. No other anchor combines display-condensed with steel-plate
  // or stencil-tag; feature-grid is the nearest neighbour and it reads
  // dense-editorial, not industrial.
  fieldwork: {
    id: "fieldwork",
    headingFont: "display-condensed",
    cardRecipe: "steel-plate",
    eyebrowStyle: "stencil-tag",
    spacing: "standard",
    sectionSurface: "light-default",
    servicesLayout: "work-index",
    aboutLayout: "statement",
    howItWorksLayout: "jobline",
    locationLayout: "coverage-panel",
    galleryLayout: "evidence-board",
  },
  // Copperline: the warm neighbourhood-trades anchor. Shares Fieldwork's
  // condensed display face (both are trades) but nothing else: rounded
  // copper-seam cards against steel-plate's hard offset stamps, a
  // hand-made junction-dot eyebrow against the stencil, and its own three
  // structural signatures — services as junctions on a pipe run, the
  // gallery as a wall of printed photos, and location as a warm home-base
  // panel instead of the dark dispatch board.
  copperline: {
    id: "copperline",
    headingFont: "display-condensed",
    cardRecipe: "copper-seam",
    eyebrowStyle: "junction-tag",
    spacing: "standard",
    sectionSurface: "light-default",
    servicesLayout: "junction-line",
    galleryLayout: "job-wall",
    locationLayout: "home-base",
  },
  // Marquee: the considered-purchase events anchor. The serif is shared
  // with Storyteller and dual-offer but the frame is not: invitation-ruled
  // square cards against their soft shadows and editorial rules, airy
  // spacing so the photography breathes, and the gallery as a lookbook
  // mosaic — the one structural override this archetype genuinely needs,
  // because for an events buyer the photos are the product. Everything
  // urgent about the trade anchors is deliberately absent: no dispatch
  // board, no job sheet, no stencils.
  marquee: {
    id: "marquee",
    headingFont: "serif-editorial",
    cardRecipe: "invitation",
    eyebrowStyle: "rule-line",
    spacing: "airy",
    sectionSurface: "light-default",
    galleryLayout: "lookbook",
    leadFormVariant: "event-enquiry",
  },
};

export function getAnchor(id: TemplateId): TemplateAnchor {
  return anchors[id];
}
