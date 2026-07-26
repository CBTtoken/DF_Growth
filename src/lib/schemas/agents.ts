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

// Agent Programme Phase 1 Sec 1.10: "Version one is admin managed for page
// setup." Every field an agent's public page carries, validated the same
// way the public forms are, because this writes straight to a live page.
export const agentPageSchema = z.object({
  // Sec 1.2: the slug shares a namespace with business slugs and platform
  // routes. The character rule here is the shape check only; whether it is
  // actually free is a database question, answered by checkSlugAvailable
  // in the action.
  pageSlug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Pick a web address of at least 2 characters")
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only"),
  accentColor: z
    .string()
    .trim()
    .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Pick a colour"),
  town: z.string().trim().max(80).optional().or(z.literal("")),
  whatsappNumber: z.string().trim().max(30).optional().or(z.literal("")),
  activeSince: z.string().trim().optional().or(z.literal("")),
  heroPromise: z.string().trim().max(200).optional().or(z.literal("")),
  storyText: z.string().trim().max(1200).optional().or(z.literal("")),
  offerText: z.string().trim().max(500).optional().or(z.literal("")),
});

// Sec 1.6's four questions, kept so a redraft never needs the agent
// interviewed again.
export const agentCopyIntakeSchema = z.object({
  before: z.string().trim().min(1, "Answer this one so there is something to write from").max(1000),
  why: z.string().trim().min(1, "Answer this one so there is something to write from").max(1000),
  who: z.string().trim().min(1, "Answer this one so there is something to write from").max(1000),
  area: z.string().trim().min(1, "Answer this one so there is something to write from").max(1000),
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
