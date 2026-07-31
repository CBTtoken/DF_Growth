import { z } from "zod";

// The generated page plan.
//
// This is the contract that replaces template picking. A model reads what a
// member told us about their business and answers three questions: which
// sections does THIS business need, in what order, and what goes in them.
// A component library renders the answer.
//
// The model never writes code. Everything here is data, which is what makes
// the result reviewable, diffable, and above all editable by the member in
// their own backoffice. Hand-written JSX, which is how Buffelskop and HelpLift
// were built, cannot be edited by the person who owns the page.
//
// Every choice the model is allowed to make is a closed set. It picks a
// palette from a list, an icon from a list, a section type from a list. It
// cannot invent a colour that fails contrast or an icon that does not exist,
// because it is never given the option.

// ---------------------------------------------------------------------------
// Closed vocabularies
// ---------------------------------------------------------------------------

// Icons the model may choose from, by meaning rather than by name, so it picks
// for sense instead of guessing at the lucide export list. Every one of these
// is verified to exist in lucide-react, which is already a dependency.
export const ICON_KEYS = [
  "wrench", "hammer", "paintRoller", "plug", "droplet", "flame", "home", "building",
  "shield", "clock", "calendar", "phone", "mapPin", "truck", "package", "scissors",
  "sparkles", "heart", "handshake", "users", "graduation", "briefcase", "chart",
  "leaf", "sun", "camera", "brush", "pen", "star", "check", "award", "target",
  "lightbulb", "settings", "search", "message", "shoppingBag", "creditCard", "key",
] as const;

// Palettes are designed, not generated. Each is a full surface system that has
// been checked for contrast, so the model choosing "wrong" produces a page that
// suits the business badly, never one that is unreadable. The member's own
// brand colour, where they have one, overrides the accent at render time.
export const PALETTE_KEYS = [
  "slate-professional",
  "warm-earth",
  "deep-forest",
  "clean-clinical",
  "bold-industrial",
  "soft-craft",
  "night-premium",
] as const;

// Reuses the four heading fonts already loaded by the anchor system, so this
// introduces no new font payload and inherits its LCP protection.
export const TYPE_KEYS = ["sans-default", "serif-editorial", "display-condensed", "mono-technical"] as const;

export const SECTION_TYPES = [
  "hero",
  "intro",
  "pillars",
  "services",
  "process",
  "featureSplit",
  "faq",
  "gallery",
  "notice",
  "ctaBand",
] as const;

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

const iconKey = z.enum(ICON_KEYS);

// Photo slots are named by what the photo should BE, not by position. That
// name is what the member is asked for by email: "a photo of finished work"
// gets photos, "upload an image" does not.
const photoSlot = z.object({
  slotId: z.string().min(1).max(40),
  brief: z.string().min(10).max(160),
});

const heroSection = z.object({
  type: z.literal("hero"),
  eyebrow: z.string().max(60).optional(),
  headline: z.string().min(3).max(90),
  subheadline: z.string().max(200),
  // Optional because a business with no photograph gets a typographic hero,
  // which is a deliberate look rather than a gap.
  photoSlot: photoSlot.optional(),
});

const introSection = z.object({
  type: z.literal("intro"),
  heading: z.string().min(3).max(90),
  paragraphs: z.array(z.string().min(40).max(700)).min(1).max(3),
});

// The HelpLift "Four Pillars" shape, generalised. A business with a real
// framework gets its framework. A business without one does not get this
// section at all.
const pillarsSection = z.object({
  type: z.literal("pillars"),
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

// Services with real one-line descriptions, not bare labels. A bare list is
// what the old template system produced and is most of why those pages read
// as thin.
const servicesSection = z.object({
  type: z.literal("services"),
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

// What actually happens, for THIS trade. A plumber's first visit is not a
// tattoo consultation, and the old shared "Three simple steps" pretended
// otherwise on every page that used it.
const processSection = z.object({
  type: z.literal("process"),
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
  heading: z.string().min(3).max(90),
  body: z.string().min(40).max(600),
  photoSlot: photoSlot.optional(),
  // Lets consecutive splits alternate rather than stacking identically.
  mediaSide: z.enum(["left", "right"]).default("right"),
});

const faqSection = z.object({
  type: z.literal("faq"),
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
  heading: z.string().min(3).max(90),
  photoSlots: z.array(photoSlot).min(2).max(8),
});

// One short, important line. An emergency callout number, a delivery area, a
// standing guarantee. Only where the member actually stated it.
const noticeSection = z.object({
  type: z.literal("notice"),
  icon: iconKey,
  text: z.string().min(10).max(180),
});

const ctaBandSection = z.object({
  type: z.literal("ctaBand"),
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

// ---------------------------------------------------------------------------
// The plan
// ---------------------------------------------------------------------------

export const pagePlanSchema = z.object({
  palette: z.enum(PALETTE_KEYS),
  headingFont: z.enum(TYPE_KEYS),
  // Why the model made the calls it made. Not rendered: this is for the
  // internal review queue, so a human reading a flagged page can see the
  // reasoning instead of guessing at it.
  rationale: z.string().max(600),
  // Must start with a hero. Everything after it is the model's call.
  sections: z.array(sectionSchema).min(3).max(12),
});

export type PagePlan = z.infer<typeof pagePlanSchema>;

// Every photo the plan asks for, flattened, which is what the member gets
// emailed and what the backoffice renders upload slots for.
export function collectPhotoSlots(plan: PagePlan): PhotoSlot[] {
  const slots: PhotoSlot[] = [];
  for (const section of plan.sections) {
    if (section.type === "gallery") slots.push(...section.photoSlots);
    else if ("photoSlot" in section && section.photoSlot) slots.push(section.photoSlot);
  }
  return slots;
}
