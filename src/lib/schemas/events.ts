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

// Real UAT feedback: a single <input type="datetime-local"> has a known
// native-widget quirk in some browsers where the minute segment gets
// stuck highlighted after a click. Separate date + time inputs sidestep
// that entirely (the standard workaround) and are combined into one
// Date server-side (src/lib/events/actions.ts) rather than in the browser.
export const eventSubmissionSchema = z.object({
  eventName: z.string().trim().min(1, "Enter an event name").max(150, "Keep it under 150 characters"),
  description: z.string().trim().max(3000, "Keep it under 3000 characters").optional().or(z.literal("")),
  startDate: z.string().min(1, "Enter a start date"),
  startTime: z.string().min(1, "Enter a start time"),
  endDate: z.string().optional().or(z.literal("")),
  endTime: z.string().optional().or(z.literal("")),
  locationAddress: z.string().trim().max(300).optional().or(z.literal("")),
  city: z.string().trim().min(1, "Select a city"),
  eventType: z.enum(EVENT_TYPES.map((t) => t.value) as [string, ...string[]], { message: "Select an event type" }),
  // Real UAT feedback: contact_details previously had no actual person's
  // name, only email/phone/whatsapp — awkward for a visitor trying to
  // address the organiser directly.
  contactName: z.string().trim().max(100).optional().or(z.literal("")),
  contactEmail: z.string().email("Enter a valid contact email"),
  contactPhone: z.string().trim().max(30).optional().or(z.literal("")),
  contactWhatsapp: z.string().trim().max(30).optional().or(z.literal("")),
  facebookUrl: optionalUrl("Should be a full link, e.g. https://facebook.com/yourevent"),
  instagramUrl: optionalUrl("Should be a full link, e.g. https://instagram.com/yourevent"),
  websiteUrl: optionalUrl("Should be a full link, e.g. https://yourevent.co.za"),
  ticketInfoText: z.string().trim().max(200, "Keep it under 200 characters").optional().or(z.literal("")),
  // Real UAT feedback: for a paid event, ticketInfoText alone (free
  // descriptive text like "R50 at the door") has nowhere for a visitor to
  // actually act on it — this is a real clickable link, shown as a
  // "Book now" CTA on the event page when present.
  bookingUrl: optionalUrl("Should be a full link, e.g. https://yourbookingpage.co.za"),
});
