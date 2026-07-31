import { z } from "zod";
import { normaliseSaPhone } from "@/lib/contact/phone";

// A South African number, stored canonically as 27XXXXXXXXX. An empty string
// stays empty; anything else must parse or the member is told why.
const saPhone = z
  .string()
  .max(30)
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ?? "").trim())
  .superRefine((v, ctx) => {
    if (!v) return;
    const parsed = normaliseSaPhone(v);
    if (!parsed.ok) ctx.addIssue({ code: z.ZodIssueCode.custom, message: parsed.error });
  })
  .transform((v) => {
    if (!v) return "";
    const parsed = normaliseSaPhone(v);
    return parsed.ok ? parsed.e164 : v;
  });

// Exported so the WhatsApp onboarding conversation (lib/whatsapp/
// conversation.ts) can validate against the exact same canonical list
// instead of a second, easy-to-drift copy.
export const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
] as const;

// CLAUDE.md Section 6 — six-step client intake wizard. Step 6 only applies
// to growth_engine / enterprise tier clients (Meta ad account connection).
export const step1Schema = z.object({
  businessName: z.string().min(2),
  contactEmail: z.string().email(),
  // Combined spec Sec 20: split from one shared contactPhone field — a
  // business may want calls to ring a different line than WhatsApp.
  // Optional — shown alongside contactEmail when a lead's success state
  // reveals contact details, so a visitor has a faster/more urgent option
  // than email if the business has these to share.
  // Handoff 02 B: both numbers are validated and stored canonically now, not
  // kept as whatever the member typed. tel: and wa.me links both fail
  // silently on a malformed number, so a member never finds out their call
  // button is dead. Live data already had three formats plus one number
  // missing its leading digit entirely.
  //
  // Still optional at the schema level: a member part-way through onboarding
  // should not be blocked, and existing members predate the requirement. The
  // dashboard nags instead, and their page simply shows no buttons until a
  // number is there, which is better than a button that goes nowhere.
  callPhone: saPhone,
  whatsappPhone: saPhone,
});

// Mirrors the fields already captured by the WhatsApp onboarding flow —
// grounding data for the AI-drafted landing copy in step 4, and raw facts
// useful for building ad campaigns later.
export const step2Schema = z.object({
  province: z.enum(PROVINCES),
  industry: z.string().min(2).max(100),
  businessAddress: z.string().min(2).max(200),
  // Marketplace directory: optional, unlike province — an online-only
  // business (see the businessAddress "Online" sentinel above it in the
  // form) genuinely has no city, and forcing a value here would mean
  // picking a fake one just to get past the form.
  city: z.string().max(100).optional().or(z.literal("")),
  // Public Beta Polish Sprint Sec 7: uncapped — was max(600), a real
  // business description shouldn't be truncated. The DB column itself is
  // already `text` (unbounded), no migration needed.
  businessDescription: z.string().min(10),
  tagline: z.string().max(80).optional().or(z.literal("")),
  // Optional — a business that just wants people to get in touch (a
  // consultant, a single-service contractor) doesn't necessarily have a
  // products/services list to give, and shouldn't be forced to invent one.
  productsServices: z.string().max(600).optional().or(z.literal("")),
  additionalNotes: z.string().max(600).optional().or(z.literal("")),
  facebookUrl: z.string().url("Should be a full link, e.g. https://facebook.com/yourpage").max(300).optional().or(z.literal("")),
  instagramUrl: z.string().url("Should be a full link, e.g. https://instagram.com/yourhandle").max(300).optional().or(z.literal("")),
  // Combined spec Sec 27.
  websiteUrl: z.string().url("Should be a full link, e.g. https://yourbusiness.co.za").max(300).optional().or(z.literal("")),
});

export const step3Schema = z.object({
  brandPrimaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  brandSecondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

// "conversion" is the original hand-built layout (growth_clients.template
// stored as this literal string, not left null) — see src/lib/templates/
// registry.ts, whose 10 real archetypes are the other allowed values. Null
// is reserved for clients who existed before this step did and never saw a
// picker; onboard/page.tsx's resume logic relies on that distinction, so a
// client who deliberately picks the classic layout still needs a real,
// non-null value written here.
export const templateSchema = z.object({
  template: z.enum([
    "conversion",
    "single-action",
    "left-split",
    "feature-grid",
    "storyteller",
    "dark-mode",
    "social-proof",
    "step-by-step",
    "vibrant-geo",
    "multi-product",
    "app-dashboard",
  ]),
});

export const step5Schema = z.object({
  headline: z.string().min(5).max(80),
  subheadline: z.string().min(10).max(160),
  aboutText: z.string().min(10).max(800),
  // Optional for the same reason as step2's productsServices — a
  // contact-first business isn't forced to invent a services list, and
  // ServicesList already renders nothing when this is empty.
  servicesText: z.string().max(600).optional().or(z.literal("")),
  ctaLabel: z.string().min(2).max(30),
});

// All optional, all tiers — most small businesses won't have named
// packages, and typing nothing at all is a valid, expected submission.
// Combined spec Sec 5: not every business has a fixed price list — a
// package can be a straight Package (as before), a time-limited Special,
// or a Discount (a percentage off, e.g. "15% off standard callout fee").
// Defaults to "package" so existing client data (saved before this field
// existed) reads correctly with no migration needed — packages live in a
// jsonb column, not a typed table column, so a genuinely new field like
// this just starts appearing in new writes.
export const packageTypeSchema = z.enum(["package", "special", "discount"]);

export const step6Schema = z.object({
  package1Type: packageTypeSchema.optional(),
  package1Name: z.string().max(60).optional().or(z.literal("")),
  package1Price: z.string().max(40).optional().or(z.literal("")),
  package1Description: z.string().max(300).optional().or(z.literal("")),
  package2Type: packageTypeSchema.optional(),
  package2Name: z.string().max(60).optional().or(z.literal("")),
  package2Price: z.string().max(40).optional().or(z.literal("")),
  package2Description: z.string().max(300).optional().or(z.literal("")),
  package3Type: packageTypeSchema.optional(),
  package3Name: z.string().max(60).optional().or(z.literal("")),
  package3Price: z.string().max(40).optional().or(z.literal("")),
  package3Description: z.string().max(300).optional().or(z.literal("")),
});

// The client picks a lane before typing anything, rather than being handed
// an "optional" text box with no explanation — that invited people who
// don't know what a Pixel ID is to either freeze or type a guess.
export const step7Schema = z.discriminatedUnion("hasMetaSetup", [
  z.object({
    hasMetaSetup: z.literal("yes"),
    metaPixelId: z.string().regex(/^\d{10,20}$/, "Should be a 10-20 digit number"),
    metaAdAccountId: z.string().regex(/^(act_)?\d{5,20}$/, "Should look like act_1234567890"),
  }),
  z.object({
    hasMetaSetup: z.literal("no"),
  }),
]);
