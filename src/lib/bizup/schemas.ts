import { z } from "zod";
import { isValidVatNumberFormat, normaliseVatNumber } from "./vat";

// BizUp/docs/bizup-phase1-spec.md Sec 15.1: account setup, business
// profile and VAT status.

/** Sec 4. Free text rather than a fixed list, because SA provinces get typed a dozen ways and a wrong dropdown is worse than a wrong string on an address block. */
const optionalText = z.string().trim().optional().or(z.literal(""));

export const SA_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
] as const;

export const businessProfileSchema = z.object({
  // The name that prints at the top of every document. The one field with
  // no sensible default and no way to guess it.
  businessName: z.string().trim().min(2, "Enter your business name"),
  tradingName: optionalText,
  registrationNumber: optionalText,

  // Sec 3.1. Blank means "not a VAT vendor", which is the correct and
  // common case, not an incomplete profile. Sec 3.4: format check only, 10
  // digits beginning with 4, and we never claim to have verified it
  // against SARS.
  vatNumber: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || isValidVatNumberFormat(v), {
      message: "A SARS VAT number is 10 digits and starts with a 4. Check your VAT 103 certificate.",
    })
    .transform((v) => (v ? normaliseVatNumber(v) : "")),

  // Sec 3.2. Required on a full tax invoice (over R5,000), so it is
  // collected here rather than asked for mid-invoice with a customer
  // waiting. Optional at this step: a member who is not a VAT vendor and
  // invoices small amounts genuinely never needs it.
  addressLine1: optionalText,
  addressLine2: optionalText,
  city: optionalText,
  province: optionalText,
  postalCode: optionalText,

  email: z.string().trim().email("Enter a valid email"),
  phone: optionalText,
  // Sec 9: quotes are sent by wa.me deep link from the member's own
  // number, so this is the number their customers will reply to.
  whatsapp: optionalText,

  // Sec 3.5(b). Kept strictly separate from the rolling twelve-month VAT
  // tracker: this only groups report periods. February is correct for sole
  // proprietors and most small businesses.
  financialYearEndMonth: z.coerce.number().int().min(1).max(12).default(2),
});

export type BusinessProfileInput = z.input<typeof businessProfileSchema>;
export type BusinessProfileValues = z.output<typeof businessProfileSchema>;

// ============================================================
// Customers (Sec 4, build step 2)
// ============================================================

export const customerSchema = z.object({
  // The only required field. Sec 9's sixty-second target means a member
  // standing in a customer's kitchen must be able to save a name and get
  // on with the quote, filling in the rest later or never.
  name: z.string().trim().min(2, "Enter the customer's name"),
  isBusiness: z.coerce.boolean().default(false),
  registrationNumber: optionalText,

  // The customer's own VAT number, prompted (never required) on a full tax
  // invoice under Sec 3.2. Same SARS format as the member's own.
  vatNumber: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || isValidVatNumberFormat(v), {
      message: "A SARS VAT number is 10 digits and starts with a 4",
    })
    .transform((v) => (v ? normaliseVatNumber(v) : "")),

  // Validated only when something was actually typed. A blank email is
  // normal: plenty of customers are reached on WhatsApp alone.
  email: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: "Enter a valid email, or leave it blank",
    }),
  phone: optionalText,
  whatsapp: optionalText,

  // Sec 3.2: required on a full tax invoice, so collected here rather than
  // asked for mid-invoice. Optional at this point because most jobs never
  // cross R5,000.
  addressLine1: optionalText,
  addressLine2: optionalText,
  city: optionalText,
  province: optionalText,
  postalCode: optionalText,

  notes: optionalText,
});

export type CustomerValues = z.output<typeof customerSchema>;

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
