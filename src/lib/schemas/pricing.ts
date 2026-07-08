import { z } from "zod";

export const startCheckoutSchema = z.object({
  businessName: z.string().min(2, "Enter your business name"),
  email: z.string().email("Enter a valid email"),
  tier: z.enum(["foundation", "growth_engine", "enterprise"]),
});
