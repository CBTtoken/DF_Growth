import { z } from "zod";

// STANDING365_LANDING_BUILD_SPEC_CLAUDE.md Sec 5/6: shared fields for both
// editions, in the order the spec lists them — full name, email, phone,
// delivery address, then the required legal consent (validated by the
// checkbox itself, not here, matching Growth's own onboarding pattern).
const baseOrderFields = {
  buyerName: z.string().min(2, "Enter your name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(6, "Enter a phone number"),
  street: z.string().min(3, "Enter a street address"),
  suburb: z.string().min(2, "Enter a suburb"),
  city: z.string().min(2, "Enter a city"),
  postalCode: z.string().min(3, "Enter a postal code"),
  marketingConsent: z.boolean().default(false),
};

export const standardOrderSchema = z.object(baseOrderFields);

export const personalisedOrderSchema = z.object({
  ...baseOrderFields,
  recipientName: z.string().min(2, "Enter the recipient's name"),
  // Sec 5 suggested 300 as a starting point; bumped to 500 per real
  // feedback that 300 felt too tight for a message someone actually cares
  // about getting right (matches OrderForm.tsx's GIFT_MESSAGE_LIMIT).
  giftMessage: z.string().min(1, "Write a short message").max(500, "Keep it under 500 characters"),
});
