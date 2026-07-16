import { z } from "zod";
import { EVENT_TYPES } from "@/lib/event-types";

// Same 8-char floor as every other password field in this codebase
// (reviewer signup, business accounts) — no reason for a different bar
// here. No display name at account level, unlike reviewer_accounts — the
// organiser's public-facing name is per-event contact_details (Sec 3), the
// account itself is just an auth identity to gate submission behind.
export const organizerSignupSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

const optionalUrl = (message: string) => z.string().url(message).max(300).optional().or(z.literal(""));

export const eventSubmissionSchema = z.object({
  eventName: z.string().trim().min(1, "Enter an event name").max(150, "Keep it under 150 characters"),
  description: z.string().trim().max(3000, "Keep it under 3000 characters").optional().or(z.literal("")),
  // Submitted from a <input type="datetime-local">, e.g. "2026-08-01T18:00"
  // — z.coerce.date() parses that directly, no separate date+time fields
  // to reconcile.
  startDatetime: z.coerce.date({ message: "Enter a start date and time" }),
  endDatetime: z.coerce.date().optional(),
  locationAddress: z.string().trim().max(300).optional().or(z.literal("")),
  city: z.string().trim().min(1, "Select a city"),
  eventType: z.enum(EVENT_TYPES.map((t) => t.value) as [string, ...string[]], { message: "Select an event type" }),
  contactEmail: z.string().email("Enter a valid contact email"),
  contactPhone: z.string().trim().max(30).optional().or(z.literal("")),
  contactWhatsapp: z.string().trim().max(30).optional().or(z.literal("")),
  facebookUrl: optionalUrl("Should be a full link, e.g. https://facebook.com/yourevent"),
  instagramUrl: optionalUrl("Should be a full link, e.g. https://instagram.com/yourevent"),
  websiteUrl: optionalUrl("Should be a full link, e.g. https://yourevent.co.za"),
  ticketInfoText: z.string().trim().max(200, "Keep it under 200 characters").optional().or(z.literal("")),
});
