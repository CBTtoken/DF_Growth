import { z } from "zod";

// Rate & Review Sprint 1. Same 8-char floor as business account passwords
// (src/lib/schemas/auth.ts) — no reason for a different bar here.
export const reviewerSignupSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your first name").max(50, "Keep it under 50 characters"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

export const reviewSubmissionSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  reviewText: z.string().trim().min(10, "Say a bit more — at least 10 characters").max(2000, "Keep it under 2000 characters"),
});
