import { z } from "zod";

// Phase 2 validation. Deliberately three fields and a tick box.
//
// Every one of them is asked for a reason that can be said out loud: the
// name signs the comment, the email proves a person is real, and the tick
// box is the only thing that would otherwise hand an address to a business
// without asking.
export const boardCommentSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Enter the name you want on your comment")
    .max(40, "Keep it under 40 characters"),
  email: z.string().trim().toLowerCase().email("Enter a real email address so we can send you the code"),
  body: z
    .string()
    .trim()
    .min(2, "Write something first")
    .max(1000, "Keep it under 1000 characters"),
  quoteConsent: z.boolean().default(false),
});

export const boardOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  token: z.string().trim().min(4, "Enter the code from your email"),
});
