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

// Agent Programme Phase 1. The part of an agent's page the agent owns, and
// can edit themselves from their dashboard.
//
// Every content field is optional, on purpose. An agent must never be
// blocked from having a page because they have not written their story
// yet: the page hides any section it has no copy for, so a page with a
// name, a photo and a colour is a real, complete page. The boxes sit empty
// in their dashboard until they feel like filling them in.
export const agentPageContentSchema = z.object({
  accentColor: z
    .string()
    .trim()
    .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Pick a colour"),
  town: z.string().trim().max(80).optional().or(z.literal("")),
  whatsappNumber: z.string().trim().max(30).optional().or(z.literal("")),
  heroPromise: z.string().trim().max(200).optional().or(z.literal("")),
  storyText: z.string().trim().max(1200).optional().or(z.literal("")),
  offerText: z.string().trim().max(500).optional().or(z.literal("")),
});

// The admin-only additions on top of that. The slug is a namespace
// decision and "active since" is a credential claim on the public page, so
// neither is the agent's to set.
export const agentPageSchema = agentPageContentSchema.extend({
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
  activeSince: z.string().trim().optional().or(z.literal("")),
});

// Sec 1.6's four questions. Answering them is an offer, not a step: they
// exist so an agent who does not want to write their own copy can get a
// draft, and they are stored so a redraft never needs the agent
// interviewed again. At least one answer is required only because there is
// nothing to write from otherwise, and that check fires on the draft
// button, never on saving a page.
export const agentCopyIntakeSchema = z
  .object({
    before: z.string().trim().max(1000).optional().or(z.literal("")),
    why: z.string().trim().max(1000).optional().or(z.literal("")),
    who: z.string().trim().max(1000).optional().or(z.literal("")),
    area: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .refine((v) => [v.before, v.why, v.who, v.area].some((a) => (a ?? "").trim().length > 0), {
    message: "Answer at least one of these so there is something to write from.",
  });

// Agent Programme Phase 3, per docs/agent-recruitment-page-copy.md Sec 9.
// Five fields, down from seven. Gone: the Facebook page link, the two
// yes/no Facebook questions and the promotion method dropdown, because
// they "point applicants at Facebook group posting, which converts badly
// and risks their Meta account and your brand". In: their town, and one
// open question that "tells you more than every tick box currently on the
// form, and it filters out anyone planning to spam."
export const agentApplicationSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your full name").max(150),
  email: z.string().trim().email("Enter a valid email"),
  whatsappNumber: z.string().trim().min(1, "Enter your WhatsApp number").max(30),
  townOrArea: z.string().trim().min(1, "Tell us where you are").max(120),
  // The one that does the filtering, so it asks for a real answer rather
  // than accepting a single word.
  firstThreeBusinesses: z
    .string()
    .trim()
    .min(20, "Give us a couple of sentences here, this is the part we actually read")
    .max(2000),
});
