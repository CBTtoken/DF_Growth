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

export const step4Schema = z.object({
  metaPixelId: z.string().optional(),
  metaAdAccountId: z.string().optional(),
});
