import { z } from "zod";
import { ICON_KEYS, PALETTE_KEYS, TYPE_KEYS } from "./schema";

// The photo-led tier: a layout grammar rather than a menu of finished blocks.
//
// Dewald's criticism of the block system was exact, and adding more blocks
// would not have fixed it: "you making them block based, hence why I keep
// feeling they look the same". A bigger shelf is still a shelf.
//
// So here the model does not choose a section shape. It places ELEMENTS on a
// GRID. That is what lets it produce "the photograph bleeds off the right edge
// with the heading overlapping it and three facts underneath", which is a
// layout nobody pre-built and nobody could pre-build enough of.
//
// This tier is reserved for members with real photographs of their own work,
// because free-form layout is where things can go wrong and it is only worth
// the risk when there is real material to design around. Members without
// photos get the composed-section system in schema.ts, which is safer and,
// for a page made of text, honestly better.
//
// The guardrails are physics, not taste:
//   - Mobile always stacks. Column spans apply from the medium breakpoint up.
//   - Type scale is fixed. The model picks a step, never a size.
//   - Colours come from the palette. Contrast is enforced at render.
//   - A cell cannot span more than the grid it sits in.
// Within those, it composes freely.

// An icon is decoration, not content. A model reaching for "paw" when the
// vocabulary has no paw should not fail an otherwise good page, so an unknown
// value falls back to a neutral mark instead of throwing. Found live on
// mushroom-guru-pty-ltd.
const iconKey = z.preprocess(
  (v) => (typeof v === "string" && (ICON_KEYS as readonly string[]).includes(v) ? v : "sparkles"),
  z.enum(ICON_KEYS)
);

const photoSlot = z.object({
  slotId: z.string().min(1).max(40),
  brief: z.string().min(10).max(220),
});

// ---------------------------------------------------------------------------
// Elements
// ---------------------------------------------------------------------------

const eyebrowEl = z.object({
  kind: z.literal("eyebrow"),
  text: z.string().min(2).max(60),
});

const headingEl = z.object({
  kind: z.literal("heading"),
  text: z.string().min(2).max(120),
  // Fixed steps. "display" is once a page at most, usually the hero.
  scale: z.enum(["display", "xl", "lg", "md"]),
});

const bodyEl = z.object({
  kind: z.literal("body"),
  text: z.string().min(20).max(900),
  scale: z.enum(["lg", "base", "sm"]).default("base"),
});

const mediaEl = z.object({
  kind: z.literal("media"),
  slot: photoSlot,
  aspect: z.enum(["square", "portrait", "landscape", "wide", "tall"]),
  // "bleed" runs the image past the container edge, which is the move that
  // most makes a page look composed rather than assembled.
  treatment: z.enum(["plain", "rounded", "framed", "bleed"]).default("rounded"),
});

const listEl = z.object({
  kind: z.literal("list"),
  style: z.enum(["checks", "rules", "cards", "numbered", "plain"]),
  items: z
    .array(
      z.object({
        icon: iconKey.optional(),
        title: z.string().min(2).max(80),
        body: z.string().max(320).optional(),
      })
    )
    .min(2)
    .max(12),
});

const badgesEl = z.object({
  kind: z.literal("badges"),
  items: z.array(z.object({ icon: iconKey, label: z.string().min(2).max(40) })).min(2).max(8),
});

const quoteEl = z.object({
  kind: z.literal("quote"),
  text: z.string().min(20).max(400),
  attribution: z.string().max(80).optional(),
});

export const elementSchema = z.discriminatedUnion("kind", [
  eyebrowEl,
  headingEl,
  bodyEl,
  mediaEl,
  listEl,
  badgesEl,
  quoteEl,
]);

export type ComposedElement = z.infer<typeof elementSchema>;

// ---------------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------------

const cellSchema = z.object({
  element: elementSchema,
  /** Columns this cell occupies, out of the section's own column count. */
  span: z.number().int().min(1).max(12),
  /** 1-indexed start column. Omitted means "flow after the previous cell". */
  start: z.number().int().min(1).max(12).optional(),
  align: z.enum(["start", "center", "end"]).default("start"),
  /** Stacking order on mobile, where everything is one column. */
  order: z.number().int().min(0).max(20).optional(),
});

export type ComposedCell = z.infer<typeof cellSchema>;

const composedSectionSchema = z
  .object({
    band: z.enum(["plain", "tinted", "deep", "accent"]).default("plain"),
    padding: z.enum(["sm", "md", "lg", "xl"]).default("lg"),
    width: z.enum(["narrow", "normal", "wide", "full"]).default("normal"),
    /** Desktop grid. Everything collapses to one column on mobile. */
    columns: z.number().int().min(1).max(12),
    cells: z.array(cellSchema).min(1).max(12),
  })
  // A cell that spans more than its grid is the one structural mistake this
  // grammar makes easy, so it is rejected rather than silently clamped.
  .refine((s) => s.cells.every((c) => c.span <= s.columns), {
    message: "A cell cannot span more columns than its section has.",
  })
  .refine((s) => s.cells.every((c) => !c.start || c.start + c.span - 1 <= s.columns), {
    message: "A cell cannot start where it would overflow the grid.",
  });

export type ComposedSection = z.infer<typeof composedSectionSchema>;

export const composedPlanSchema = z.object({
  palette: z.enum(PALETTE_KEYS),
  typePairing: z.enum(TYPE_KEYS),
  rationale: z.string().max(900),
  sections: z.array(composedSectionSchema).min(3).max(14),
});

export type ComposedPlan = z.infer<typeof composedPlanSchema>;

export function collectComposedSlots(plan: ComposedPlan) {
  const slots: z.infer<typeof photoSlot>[] = [];
  for (const section of plan.sections) {
    for (const cell of section.cells) {
      if (cell.element.kind === "media") slots.push(cell.element.slot);
    }
  }
  return slots;
}
