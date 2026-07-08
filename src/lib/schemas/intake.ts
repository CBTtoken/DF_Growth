import { z } from "zod";

// CLAUDE.md Section 6 — four-step client intake wizard. Step 4 only applies
// to growth_engine / enterprise tier clients (Meta ad account connection).
export const step1Schema = z.object({
  businessName: z.string().min(2),
  contactEmail: z.string().email(),
});

export const step2Schema = z.object({
  brandPrimaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  brandSecondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export const step3Schema = z.object({
  headline: z.string().min(5).max(80),
  subheadline: z.string().min(10).max(160),
  ctaLabel: z.string().min(2).max(30),
});

// The client picks a lane before typing anything, rather than being handed
// an "optional" text box with no explanation — that invited people who
// don't know what a Pixel ID is to either freeze or type a guess.
export const step4Schema = z.discriminatedUnion("hasMetaSetup", [
  z.object({
    hasMetaSetup: z.literal("yes"),
    metaPixelId: z.string().regex(/^\d{10,20}$/, "Should be a 10-20 digit number"),
    metaAdAccountId: z.string().regex(/^(act_)?\d{5,20}$/, "Should look like act_1234567890"),
  }),
  z.object({
    hasMetaSetup: z.literal("no"),
  }),
]);
