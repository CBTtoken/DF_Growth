import { z } from "zod";

// The generated page plan.
//
// A model reads what a member told us and answers three questions: which
// sections does THIS business need, in what order, and what goes in them. A
// component library renders the answer. The model never writes code, which is
// what keeps the result reviewable and, above all, editable by the member.
//
// Revision after Dewald's review of the first three pages. His criticism was
// exact: "the font changes, not the layout". Every section type had one
// rendering, so every business's pillars looked like every other business's
// pillars and only the colours moved. Buffelskop reads as designed because
// each of its sections has its own layout and some carry two layout ideas at
// once (NatureSection is an image split AND a six-badge strip).
//
// So layout is now the model's decision too. Each section type carries a
// `layout` and most carry a `band`, which multiplies out to genuinely
// different pages rather than one page in different colours.
//
// Content and layout stay separate fields on purpose. That separation is what
// makes the member backoffice possible: it renders a plain form over the
// content ("Heading", "Item 1 title", "Item 1 body") and never shows the
// layout at all, so a member can edit their words without being able to break
// the design.

// ---------------------------------------------------------------------------
// Closed vocabularies
// ---------------------------------------------------------------------------

export const ICON_KEYS = [
  "wrench", "hammer", "paintRoller", "plug", "droplet", "flame", "home", "building",
  "shield", "clock", "calendar", "phone", "mapPin", "truck", "package", "scissors",
  "sparkles", "heart", "handshake", "users", "graduation", "briefcase", "chart",
  "leaf", "sun", "camera", "brush", "pen", "star", "check", "award", "target",
  "lightbulb", "settings", "search", "message", "shoppingBag", "creditCard", "key",
  "paw", "sprout", "recycle", "utensils", "bike", "music", "book", "globe", "lock",
] as const;

// Dewald, 2026-07-31: no full dark mode ever, it does not suit this market.
// Every palette here is light-surfaced. Each still owns a deep band colour for
// contrast, used once or twice a page, which is a different thing from a dark
// page.
export const PALETTE_KEYS = [
  "slate-professional",
  "warm-earth",
  "deep-forest",
  "clean-clinical",
  "bold-industrial",
  "soft-craft",
  "sun-coast",
  "ink-editorial",
] as const;

// Heading and body together, because what makes type feel designed is the
// relationship between the two.
export const TYPE_KEYS = [
  "editorial-serif",
  "modern-display",
  "warm-serif",
  "clean-geometric",
  "technical-sans",
  "classic-book",
] as const;

// Which surface a section sits on. The model choosing these is most of what
// gives a page its rhythm: a run of eight plain bands reads as a template
// however good the content is.
export const BAND_KEYS = ["plain", "tinted", "deep"] as const;

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

// Unknown icons fall back rather than failing the plan. See composed-schema.ts.
const iconKey = z.preprocess(
  (v) => (typeof v === "string" && (ICON_KEYS as readonly string[]).includes(v) ? v : "sparkles"),
  z.enum(ICON_KEYS)
);
const band = z.enum(BAND_KEYS).default("plain");

// Photo slots are named by what the photo should BE. That name is what the
// member gets emailed, and "a finished bathroom re-tile, taken in daylight"
// gets photos where "upload an image" does not.
const photoSlot = z.object({
  slotId: z.string().min(1).max(40),
  // 220 rather than 160. The first run at 160 rejected an otherwise good plan
  // over a brief that ran six characters long, and a brief is an instruction
  // to a person holding a phone, so specific beats short. This is the only
  // field where length is a feature.
  brief: z.string().min(10).max(220),
});

// The Buffelskop move: a short row of badges under a section, carrying the
// quick facts that would otherwise bloat the prose. Optional on the sections
// where it makes sense, which is what lets one section hold two layout ideas.
const featureStrip = z
  .array(z.object({ icon: iconKey, label: z.string().min(2).max(40) }))
  .min(3)
  .max(6);

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

const heroSection = z.object({
  type: z.literal("hero"),
  // "stacked" is a big centred statement, "split" pairs copy with a photo,
  // "editorial" runs an oversized headline with the subheadline offset below,
  // "framed" sets the whole hero inside the deep band colour.
  layout: z.enum(["stacked", "split", "editorial", "framed"]),
  eyebrow: z.string().max(60).optional(),
  headline: z.string().min(3).max(90),
  subheadline: z.string().max(200),
  photoSlot: photoSlot.optional(),
  featureStrip: featureStrip.optional(),
});

const introSection = z.object({
  type: z.literal("intro"),
  // "split-heading" holds the heading left against the body right,
  // "statement" centres a single large paragraph, "columns" runs the body in
  // two columns under a full-width heading.
  layout: z.enum(["split-heading", "statement", "columns"]),
  band,
  heading: z.string().min(3).max(90),
  paragraphs: z.array(z.string().min(40).max(700)).min(1).max(3),
  featureStrip: featureStrip.optional(),
});

const pillarsSection = z.object({
  type: z.literal("pillars"),
  // "icon-cards" is the safe grid, "numbered" drops the icons for large
  // numerals and a rule, "wide-rows" gives each pillar a full-width row with
  // the icon set left, "quiet" removes the card entirely and separates with
  // hairlines.
  layout: z.enum(["icon-cards", "numbered", "wide-rows", "quiet"]),
  band,
  eyebrow: z.string().max(60).optional(),
  heading: z.string().min(3).max(90),
  items: z
    .array(
      z.object({
        icon: iconKey,
        title: z.string().min(2).max(60),
        body: z.string().min(20).max(300),
      })
    )
    .min(2)
    .max(6),
});

const servicesSection = z.object({
  type: z.literal("services"),
  // "cards" is the grid, "list-rows" is a single dense column with rules,
  // "two-column" splits a heading off to the side, "tiles" is a compact
  // label-only grid for members with many short services.
  layout: z.enum(["cards", "list-rows", "two-column", "tiles"]),
  band,
  eyebrow: z.string().max(60).optional(),
  heading: z.string().min(3).max(90),
  items: z
    .array(
      z.object({
        name: z.string().min(2).max(70),
        description: z.string().max(200).optional(),
      })
    )
    .min(2)
    .max(14),
});

const processSection = z.object({
  type: z.literal("process"),
  // "steps" is the vertical numbered list, "timeline" runs horizontally with
  // a connecting rule, "big-numbers" sets oversized numerals as the design.
  layout: z.enum(["steps", "timeline", "big-numbers"]),
  band,
  eyebrow: z.string().max(60).optional(),
  heading: z.string().min(3).max(90),
  steps: z
    .array(
      z.object({
        title: z.string().min(2).max(60),
        body: z.string().min(20).max(300),
      })
    )
    .min(2)
    .max(5),
});

const featureSplitSection = z.object({
  type: z.literal("featureSplit"),
  // "clean" is a plain two-column split, "framed" puts the photo in a raised
  // frame, "offset" lets the photo break out of the column for asymmetry.
  layout: z.enum(["clean", "framed", "offset"]),
  band,
  mediaSide: z.enum(["left", "right"]).default("right"),
  heading: z.string().min(3).max(90),
  body: z.string().min(40).max(600),
  photoSlot: photoSlot.optional(),
  featureStrip: featureStrip.optional(),
});

const faqSection = z.object({
  type: z.literal("faq"),
  layout: z.enum(["cards", "rules", "two-column"]),
  band,
  heading: z.string().min(3).max(90),
  items: z
    .array(
      z.object({
        question: z.string().min(6).max(160),
        answer: z.string().min(20).max(600),
      })
    )
    .min(2)
    .max(8),
});

const gallerySection = z.object({
  type: z.literal("gallery"),
  // "grid" is uniform, "feature" gives the first photo double width,
  // "strip" is a single wide row.
  layout: z.enum(["grid", "feature", "strip"]),
  band,
  heading: z.string().min(3).max(90),
  photoSlots: z.array(photoSlot).min(2).max(8),
});

const noticeSection = z.object({
  type: z.literal("notice"),
  icon: iconKey,
  text: z.string().min(10).max(180),
});

const ctaBandSection = z.object({
  type: z.literal("ctaBand"),
  band,
  heading: z.string().min(3).max(90),
  body: z.string().max(300).optional(),
});

export const sectionSchema = z.discriminatedUnion("type", [
  heroSection,
  introSection,
  pillarsSection,
  servicesSection,
  processSection,
  featureSplitSection,
  faqSection,
  gallerySection,
  noticeSection,
  ctaBandSection,
]);

export type PageSection = z.infer<typeof sectionSchema>;
export type PhotoSlot = z.infer<typeof photoSlot>;
export type FeatureStrip = z.infer<typeof featureStrip>;

// ---------------------------------------------------------------------------
// The plan
// ---------------------------------------------------------------------------

export const pagePlanSchema = z.object({
  palette: z.enum(PALETTE_KEYS),
  typePairing: z.enum(TYPE_KEYS),
  rhythm: z.enum(["generous", "standard", "compact"]).default("standard"),
  // Why the model made the calls it made. Not rendered: this is for the
  // internal review queue, so a human looking at a flagged page can read the
  // reasoning instead of guessing at it.
  rationale: z.string().max(900),
  sections: z.array(sectionSchema).min(3).max(12),
});

export type PagePlan = z.infer<typeof pagePlanSchema>;

export function collectPhotoSlots(plan: PagePlan): PhotoSlot[] {
  const slots: PhotoSlot[] = [];
  for (const section of plan.sections) {
    if (section.type === "gallery") slots.push(...section.photoSlots);
    else if ("photoSlot" in section && section.photoSlot) slots.push(section.photoSlot);
  }
  return slots;
}
