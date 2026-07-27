import { z } from "zod";
import { isValidVatNumberFormat, normaliseVatNumber } from "./vat";
import { parseAmountToCents } from "./money";

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

// ============================================================
// Price list (Sec 11, build step 3)
// ============================================================

/**
 * Sec 11's three broad shapes, plus callout and other so a plumber's
 * callout fee does not have to be filed as labour. Labels are what the
 * member sees, values are what the database stores.
 */
export const CATALOGUE_TYPES = [
  { value: "labour", label: "Labour" },
  { value: "part", label: "Part" },
  { value: "product", label: "Product" },
  { value: "travel", label: "Travel" },
  { value: "callout", label: "Callout" },
  { value: "other", label: "Other" },
] as const;

/**
 * The unit is what makes a stored price mean anything: R450 is a very
 * different number per hour than per job.
 */
export const CATALOGUE_UNITS = [
  { value: "hour", label: "per hour" },
  { value: "day", label: "per day" },
  { value: "each", label: "each" },
  { value: "km", label: "per km" },
  { value: "callout", label: "per callout" },
  { value: "job", label: "per job" },
] as const;

export const catalogueItemSchema = z.object({
  name: z.string().trim().min(2, "Give this a name you will recognise"),
  description: optionalText,
  type: z.enum(["labour", "part", "product", "travel", "callout", "other"]).default("labour"),
  unit: z.enum(["hour", "day", "each", "km", "callout", "job"]).default("each"),

  // Typed by a member on a phone, so it arrives as text and can look like
  // "450", "R450,00" or "1 234.50". parseAmountToCents handles all of
  // those and returns null for anything it cannot read confidently, which
  // becomes a validation message rather than a silently wrong price.
  unitPriceExclCents: z
    .string()
    .trim()
    .min(1, "Enter a price")
    .transform((v, ctx) => {
      const cents = parseAmountToCents(v);
      if (cents === null || cents < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a price like 450 or 450.00" });
        return z.NEVER;
      }
      return cents;
    }),

  // Which of the two markup fields is in force. Only one is ever applied,
  // so the unused one is nulled on save rather than left holding a stale
  // value that would come back the moment the type was switched again.
  markupType: z.enum(["percent", "amount"]).default("percent"),

  // The flat rand form of the markup. Same blank-means-null rule as the
  // percentage below.
  defaultMarkupAmountCents: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v, ctx) => {
      if (!v) return null;
      const cents = parseAmountToCents(v);
      if (cents === null || cents < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter an amount like 150 or 150.00" });
        return z.NEVER;
      }
      return cents;
    }),

  // Sec 11: "a plumber buys a geyser at cost and bills at cost plus
  // margin". Blank means no markup, which is the normal case, so a blank
  // becomes null rather than zero.
  defaultMarkupPct: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v, ctx) => {
      if (!v) return null;
      const n = Number(v.replace(",", "."));
      if (!Number.isFinite(n) || n < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a percentage like 20" });
        return z.NEVER;
      }
      return n;
    }),

  // The insurance rate for this item, for accounts that charge one. Blank
  // is the normal case and means "same price either way", so it becomes
  // null rather than zero: a null falls back to the price above, while a
  // zero would put R0.00 on a real quote.
  insurancePriceExclCents: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v, ctx) => {
      if (!v) return null;
      const cents = parseAmountToCents(v);
      if (cents === null || cents < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a price like 450 or 450.00" });
        return z.NEVER;
      }
      return cents;
    }),
});

export type CatalogueItemValues = z.output<typeof catalogueItemSchema>;

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
