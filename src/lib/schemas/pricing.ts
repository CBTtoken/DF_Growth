import { z } from "zod";

export const startCheckoutSchema = z
  .object({
    businessName: z.string().min(2, "Enter your business name"),
    email: z.string().email("Enter a valid email"),
    // Combined spec Sec 12: a client-side typo in this one field is
    // unrecoverable — DigitalFlyer has no other way to reach them, and the
    // account they just paid for or started a trial on is stuck at an
    // address nobody can read. The client (TierCard.tsx) blocks paste/
    // autocomplete on this field so it actually catches a typo rather than
    // a pasted duplicate of the same mistake; this refine is the real gate,
    // server-side, since the client-side block is only ever a UX nudge.
    confirmEmail: z.string().email("Enter a valid email"),
    tier: z.enum(["foundation", "growth_engine", "enterprise"]),
    // Only meaningful for growth_engine (the only tier with a real choice) —
    // defaults to monthly so the field can be safely omitted by tiers that
    // don't render the toggle.
    interval: z.enum(["monthly", "annual"]).optional().default("monthly"),
    // An unchecked HTML checkbox simply isn't present in FormData at all —
    // there's no "false" value to parse, only presence or absence. Sprint 1
    // Build Item 9: signup cannot complete without this being checked.
    consent: z.literal("on", { errorMap: () => ({ message: "You must agree to the Privacy Policy and Terms & Conditions to continue" }) }),
    // Combined spec Sec 17: separate, optional, unticked by default —
    // signup completes fine whether or not this is checked.
    marketingConsent: z.literal("on").optional(),
    // Hybrid fallback field, real agent feedback follow-up: only ever
    // rendered when the referral cookie *didn't* already resolve an
    // agent — a visitor self-reporting who referred them, for the
    // cross-device case a cookie alone can't catch.
    referredAgentName: z.string().trim().max(150).optional(),
  })
  .refine((data) => data.email.trim().toLowerCase() === data.confirmEmail.trim().toLowerCase(), {
    message: "Emails don't match",
    path: ["confirmEmail"],
  });
