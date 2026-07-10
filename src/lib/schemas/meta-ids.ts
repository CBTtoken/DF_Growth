import { z } from "zod";

// Same format rules as step6Schema's "yes" branch in intake.ts — this lets a
// client add their Pixel/Ad Account ID from the dashboard after onboarding,
// for a client who picked "I don't know / need help" during signup but later
// gets these details, or who just wants to update them.
export const metaIdsSchema = z.object({
  metaPixelId: z.string().regex(/^\d{10,20}$/, "Should be a 10-20 digit number"),
  metaAdAccountId: z.string().regex(/^(act_)?\d{5,20}$/, "Should look like act_1234567890"),
});
