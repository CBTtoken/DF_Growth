import { z } from "zod";

// docs/GROWTH_BOOKING_SHOP_MODULES_CLAUDE.md Sec 3.1: three resource types,
// tracked through the same underlying tables regardless of type.
export const BOOKABLE_UNIT_TYPES = ["time_slot", "day_night", "capacity"] as const;

export const bookableUnitSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(150, "Keep it under 150 characters"),
  unitType: z.enum(BOOKABLE_UNIT_TYPES, { message: "Choose a booking type" }),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  // Rands in the form, converted to cents server-side — matches how every
  // other price input in this app (Packages) is authored.
  basePrice: z.coerce.number().min(0, "Enter a price of 0 or more"),
  capacity: z.coerce.number().int().min(1).optional(),
  durationMinutes: z.coerce.number().int().min(5).optional(),
});

// Sec 3.4: "operating hours, buffer intervals... minimum advance-booking
// window." One row per client (booking_operational_rules.growth_client_id
// is the primary key) — this schema is the whole row, not a single field.
export const bookingRulesSchema = z.object({
  bufferMinutes: z.coerce.number().int().min(0).max(240).default(0),
  minAdvanceHours: z.coerce.number().int().min(0).max(720).default(0),
  cancellationPolicyText: z.string().trim().max(2000).optional().or(z.literal("")),
});

// Sec 3.2: "Selecting a slot triggers an availability check... holds for 10
// minutes." Public, visitor-facing — deliberately minimal, matching
// leadSchema's shape (name/email/phone, all server-validated again).
export const bookingHoldSchema = z.object({
  bookableUnitId: z.string().uuid(),
  startsAt: z.string().min(1, "Choose a date and time"),
  endsAt: z.string().min(1, "Choose a date and time"),
  quantity: z.coerce.number().int().min(1).max(1000).default(1),
  customerName: z.string().trim().min(1, "Enter your name").max(150),
  customerPhone: z.string().trim().min(1, "Enter your phone number").max(30),
  customerEmail: z.string().email("Enter a valid email"),
});
