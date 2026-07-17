import { z } from "zod";

// Sec 3: application-only, no password/account fields here at all — an
// applicant creates no account until Sprint 2's agent-comped Growth
// signup, well after approval.
// Sec 4: the comped-signup mini-form — just enough to provision a real
// Foundation-shaped growth_client, same two fields Foundation's own
// pricing-page signup asks for. Email doubles as the lookup key against
// the agent's own approved application (see startAgentCompedSignup).
export const agentCompedSignupSchema = z.object({
  email: z.string().trim().email("Enter the email your agent application was approved under"),
  businessName: z.string().trim().min(2, "Enter your business or agency name"),
  // A comped page is still a real growth_clients account, same as any
  // paying signup — same required legal agreement applies.
  consent: z.literal("on", {
    errorMap: () => ({ message: "You must agree to the Privacy Policy and Terms & Conditions to continue" }),
  }),
});

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
