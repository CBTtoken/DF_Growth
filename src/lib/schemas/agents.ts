import { z } from "zod";

// Sec 3: application-only, no password/account fields here at all — an
// applicant creates no account until Sprint 2's agent-comped Growth
// signup, well after approval.
export const agentApplicationSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your full name").max(150),
  email: z.string().trim().email("Enter a valid email"),
  whatsappNumber: z.string().trim().min(1, "Enter your WhatsApp number").max(30),
  facebookPageUrl: z.string().trim().url("Enter a full link, e.g. https://facebook.com/yourpage").max(300),
  understandsFacebookRules: z.string().trim().min(1, "Tell us a little about this").max(1000),
  canGenerateContent: z.string().trim().min(1, "Tell us a little about this").max(1000),
  promotionMethod: z.enum(["facebook_only", "beyond_facebook", "both"], {
    message: "Select how you'll be promoting",
  }),
});
