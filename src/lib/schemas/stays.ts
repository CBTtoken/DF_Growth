import { z } from "zod";
import { PROPERTY_AMENITIES, ROOM_AMENITIES } from "@/lib/stays/amenities";

// Stays and Tours validation, in one file.
//
// Two audiences with different rules. A member typing into their own
// dashboard gets helpful messages about their own settings; a stranger
// posting a booking form gets validated hard and told nothing about the
// shape of the data underneath.

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date");

// ============================================================
// The member's own settings
// ============================================================

export const propertySchema = z.object({
  intro: z.string().trim().max(1200, "Keep it under 1200 characters").optional().or(z.literal("")),
  checkInFrom: z.string().trim().max(40).optional().or(z.literal("")),
  checkOutBy: z.string().trim().max(40).optional().or(z.literal("")),
  balanceDueDays: z.coerce.number().int().min(0).max(90),
  cancellationTerms: z.string().trim().max(3000, "Keep it under 3000 characters").optional().or(z.literal("")),
  amenities: z.array(z.enum(PROPERTY_AMENITIES.map((a) => a.slug) as [string, ...string[]])).default([]),
});

export const roomTypeSchema = z
  .object({
    name: z.string().trim().min(1, "Give this room a name").max(120, "Keep the name under 120 characters"),
    description: z.string().trim().max(1500, "Keep it under 1500 characters").optional().or(z.literal("")),
    maxAdults: z.coerce.number().int().min(1, "At least one adult").max(20),
    maxChildren: z.coerce.number().int().min(0).max(20),
    unitsCount: z.coerce.number().int().min(1, "You need at least one of these rooms").max(100),
    // Rands in the form, cents in the database, the same way every other
    // price input in this app is authored. Empty means "not priced yet",
    // which is a real and useful state: a room type can be described
    // before its rate is decided, it simply is not offered until it is.
    rate: z
      .union([z.literal(""), z.coerce.number().min(0, "Enter a rate of 0 or more").max(1_000_000)])
      .optional(),
    depositKind: z.enum(["percent", "fixed"]),
    depositPercent: z.coerce.number().int().min(0).max(100),
    depositFixed: z.coerce.number().min(0).max(1_000_000),
    amenities: z.array(z.enum(ROOM_AMENITIES.map((a) => a.slug) as [string, ...string[]])).default([]),
    photoIds: z.array(z.string().uuid()).default([]),
  })
  .refine((data) => data.depositKind !== "fixed" || data.depositFixed > 0, {
    message: "Enter the deposit amount",
    path: ["depositFixed"],
  });

export const tourSchema = z.object({
  title: z.string().trim().min(1, "Give this tour a title").max(140, "Keep the title under 140 characters"),
  summary: z.string().trim().max(300, "Keep the summary under 300 characters").optional().or(z.literal("")),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  itinerary: z.string().trim().max(6000).optional().or(z.literal("")),
  meetingPoint: z.string().trim().max(300).optional().or(z.literal("")),
  departureDate: isoDate,
  departureTime: z.string().trim().max(40).optional().or(z.literal("")),
  durationText: z.string().trim().max(80).optional().or(z.literal("")),
  price: z.coerce.number().min(0, "Enter a price of 0 or more").max(1_000_000),
  seatsTotal: z.coerce.number().int().min(1, "At least one seat").max(500),
  depositKind: z.enum(["percent", "fixed"]),
  depositPercent: z.coerce.number().int().min(0).max(100),
  depositFixed: z.coerce.number().min(0).max(1_000_000),
  photoIds: z.array(z.string().uuid()).default([]),
  isPublished: z.coerce.boolean().default(false),
});

export const blockSchema = z
  .object({
    roomTypeId: z.string().uuid(),
    firstNight: isoDate,
    lastNight: isoDate,
    units: z.coerce.number().int().min(1).max(100),
    reason: z.string().trim().max(200).optional().or(z.literal("")),
  })
  .refine((data) => data.lastNight >= data.firstNight, {
    message: "The last night cannot be before the first",
    path: ["lastNight"],
  });

export const cancelBookingSchema = z.object({
  bookingId: z.string().uuid(),
  kind: z.enum(["stay", "tour"]),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
  refundGiven: z.coerce.boolean().default(false),
  refundNote: z.string().trim().max(300).optional().or(z.literal("")),
});

// ============================================================
// The guest
// ============================================================

/** What the date and guest picker submits. Everything else follows from it. */
export const staySearchSchema = z
  .object({
    checkIn: isoDate,
    checkOut: isoDate,
    adults: z.coerce.number().int().min(1, "At least one adult").max(20),
    children: z.coerce.number().int().min(0).max(20),
  })
  .refine((data) => data.checkOut > data.checkIn, {
    message: "Your check out date must be after your check in date",
    path: ["checkOut"],
  });

export const stayHoldSchema = z
  .object({
    roomTypeId: z.string().uuid(),
    checkIn: isoDate,
    checkOut: isoDate,
    adults: z.coerce.number().int().min(1).max(20),
    children: z.coerce.number().int().min(0).max(20),
    // Phase 1 sells one unit of one room type per booking. A guest wanting
    // two rooms books twice, which is honest and correct, and avoids
    // pretending the party can be split across rooms in ways only the
    // member can actually judge.
    guestName: z.string().trim().min(2, "Enter your name").max(120),
    guestEmail: z.string().trim().email("Enter a valid email address").max(200),
    guestPhone: z.string().trim().min(6, "Enter your phone number").max(30),
  })
  .refine((data) => data.checkOut > data.checkIn, {
    message: "Your check out date must be after your check in date",
    path: ["checkOut"],
  });

export const tourHoldSchema = z.object({
  tourId: z.string().uuid(),
  seats: z.coerce.number().int().min(1, "Choose at least one seat").max(50),
  guestName: z.string().trim().min(2, "Enter your name").max(120),
  guestEmail: z.string().trim().email("Enter a valid email address").max(200),
  guestPhone: z.string().trim().min(6, "Enter your phone number").max(30),
});

export const waitlistSchema = z.object({
  tourId: z.string().uuid(),
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().email("Enter a valid email address").max(200).optional().or(z.literal("")),
  phone: z.string().trim().min(6, "Enter your phone number").max(30).optional().or(z.literal("")),
  people: z.coerce.number().int().min(1).max(50),
  note: z.string().trim().max(400).optional().or(z.literal("")),
});

export const guestMessageSchema = z.object({
  token: z.string().trim().min(10).max(120),
  body: z.string().trim().min(1, "Type your message").max(2000, "Keep it under 2000 characters"),
});
