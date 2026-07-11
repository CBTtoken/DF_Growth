import { z } from "zod";

// Google Search Console and Meta Business domain verification both work the
// same way: a single meta tag with a client-provided content string, pasted
// straight from each platform's own "verify by HTML tag" option. Both
// optional and independent, a client may only need one or the other.
export const domainVerificationSchema = z.object({
  googleSiteVerification: z
    .string()
    .max(200)
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : null)),
  facebookDomainVerification: z
    .string()
    .max(200)
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : null)),
});
