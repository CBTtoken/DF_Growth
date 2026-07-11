import { z } from "zod";

export const startCheckoutSchema = z.object({
  businessName: z.string().min(2, "Enter your business name"),
  email: z.string().email("Enter a valid email"),
  tier: z.enum(["foundation", "growth_engine", "enterprise"]),
  // Only meaningful for growth_engine (the only tier with a real choice) —
  // defaults to monthly so the field can be safely omitted by tiers that
  // don't render the toggle.
  interval: z.enum(["monthly", "annual"]).optional().default("monthly"),
  // An unchecked HTML checkbox simply isn't present in FormData at all —
  // there's no "false" value to parse, only presence or absence. Sprint 1
  // Build Item 9: signup cannot complete without this being checked.
  consent: z.literal("on", { errorMap: () => ({ message: "You must agree to the Privacy Policy and Terms & Conditions to continue" }) }),
});
