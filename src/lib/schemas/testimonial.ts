import { z } from "zod";

export const testimonialSchema = z.object({
  authorName: z.string().min(2, "Enter a name"),
  quote: z.string().min(10, "Quote should be at least 10 characters").max(300),
  rating: z.string().optional(),
});
