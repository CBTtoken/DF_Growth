import { z } from "zod";

export const leadSchema = z.object({
  name: z.string().min(2, "Enter your name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  // Public Beta Polish Sprint Sec 5: optional, matches the existing
  // phone field's tone — a visitor with a quick question shouldn't be
  // blocked from submitting just because they don't want to type more.
  message: z.string().max(2000).optional(),
});

// Public Beta Polish Sprint Sec 5: the marketing homepage's own "Get in
// Touch" block — a homepage enquiry is about DigitalFlyer itself, not any
// specific client, so it's a separate schema/table (homepage_inquiries)
// rather than reusing leadSchema's growth_client_id-bound shape.
export const homepageInquirySchema = z.object({
  name: z.string().min(2, "Enter your name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  message: z.string().max(2000).optional(),
});
