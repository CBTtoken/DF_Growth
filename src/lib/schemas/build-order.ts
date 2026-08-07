import { z } from "zod";

// Sprint "Onboarding two doors" item 1. Deliberately short: this asks only
// what a build genuinely needs, per the handoff. Everything else about the
// business is gathered during the build itself, from the member's own words
// below, rather than by making a stranger fill in twenty fields before they
// have paid us anything.
export const buildOrderSchema = z
  .object({
    businessName: z.string().trim().min(2, "Enter your business name"),
    industry: z.string().trim().min(2, "Choose your trade"),
    // The single most valuable field on the form. The Build Kit's B3 rule
    // is to write from the member's own words, so this is what the copy is
    // actually built from.
    ownWords: z
      .string()
      .trim()
      .min(30, "Tell us a bit more, at least a sentence or two")
      .max(2000, "Keep it under 2000 characters"),
    callPhone: z.string().trim().min(9, "Enter a phone number customers can call"),
    whatsappPhone: z.string().trim().min(9, "Enter your WhatsApp number"),
    businessAddress: z.string().trim().min(4, "Tell us where you work, in plain words"),
    email: z.string().trim().email("Enter a valid email"),
    confirmEmail: z.string().trim().email("Enter the same email again"),
    tier: z.enum(["foundation", "growth_engine"]),
    interval: z.enum(["monthly", "annual"]),
    consent: z.literal("on", { message: "Please accept the terms to continue" }),
    marketingConsent: z.string().optional(),
  })
  // Same top-level refine the pricing form uses, and the same reason: a
  // mistyped email means an account nobody can log into, and the build we
  // are paid to do lands in a mailbox that does not exist.
  .refine((data) => data.email.toLowerCase() === data.confirmEmail.toLowerCase(), {
    message: "The two email addresses do not match",
    path: ["confirmEmail"],
  });

export type BuildOrderInput = z.infer<typeof buildOrderSchema>;
