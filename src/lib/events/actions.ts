"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { organizerSignupSchema, eventSubmissionSchema } from "@/lib/schemas/events";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";

type EventFormState = { error?: Record<string, string[]> & { _form?: string[] }; success?: boolean } | null;

function parseEventFields(formData: FormData) {
  return eventSubmissionSchema.safeParse({
    eventName: formData.get("eventName"),
    description: formData.get("description"),
    startDatetime: formData.get("startDatetime"),
    endDatetime: formData.get("endDatetime") || undefined,
    locationAddress: formData.get("locationAddress"),
    city: formData.get("city"),
    eventType: formData.get("eventType"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    contactWhatsapp: formData.get("contactWhatsapp"),
    facebookUrl: formData.get("facebookUrl"),
    instagramUrl: formData.get("instagramUrl"),
    websiteUrl: formData.get("websiteUrl"),
    ticketInfoText: formData.get("ticketInfoText"),
  });
}

// Sec 6's Turnstile/spam gate is Sprint 2 — every Sprint 1 submission
// publishes immediately (see the migration's status default), so this is
// the one write path every submit action below funnels through once it
// has a resolved organizer_account_id.
async function insertEvent(organizerAccountId: string, data: ReturnType<typeof parseEventFields>["data"]) {
  if (!data) return { error: { _form: ["Something went wrong — please try again."] } };

  const admin = createAdminClient();
  const { error } = await admin.from("events").insert({
    organizer_account_id: organizerAccountId,
    event_name: data.eventName,
    description: data.description || null,
    start_datetime: data.startDatetime.toISOString(),
    end_datetime: data.endDatetime ? data.endDatetime.toISOString() : null,
    location_address: data.locationAddress || null,
    city: data.city,
    event_type: data.eventType,
    social_links: {
      facebook: data.facebookUrl || null,
      instagram: data.instagramUrl || null,
      website: data.websiteUrl || null,
    },
    contact_details: {
      email: data.contactEmail,
      phone: data.contactPhone || null,
      whatsapp: data.contactWhatsapp || null,
    },
    ticket_info_text: data.ticketInfoText || null,
  });

  if (error) {
    console.error("Failed to create event", error);
    return { error: { _form: ["Something went wrong saving your event — please try again."] } };
  }

  return { success: true };
}

// Sec 2: "no need to create a second account if they're already a member"
// — and equally, a returning organiser who's already confirmed their
// email shouldn't need one either. Both cases share this: an
// event_organizers row is created transparently the first time any
// already-authenticated user lists an event, keyed on their existing
// auth.uid(). Never called for a brand-new signup (submitEventNewOrganizer
// creates the row itself, in the same request as the signUp call).
async function getOrCreateOrganizerAccount(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("event_organizers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await admin
    .from("event_organizers")
    .insert({ user_id: userId })
    .select("id")
    .single();
  if (error || !created) {
    console.error("Failed to create event_organizers row", error);
    return null;
  }
  return created.id;
}

// New organiser, no existing DigitalFlyer login at all. Combined signup +
// listing in one action, same reasoning as Rate & Review's
// submitReviewNewReviewer — the real user journey is "I want to list my
// event," account creation is incidental to that. OTP-code email
// confirmation (verifyEventOrganizerSignupOtp below), not a clickable
// link — standing pattern across this project since the Zoho
// link-scanning incident (Rate & Review Sprint 1). The event itself
// publishes immediately regardless of confirmation status (see the
// migration comment) — confirming the code only secures the organiser's
// ability to log back in later, it doesn't gate this listing.
export async function submitEventNewOrganizer(_prevState: EventFormState, formData: FormData): Promise<EventFormState> {
  const signupParsed = organizerSignupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const eventParsed = parseEventFields(formData);

  if (!signupParsed.success) return { error: signupParsed.error.flatten().fieldErrors };
  if (!eventParsed.success) return { error: eventParsed.error.flatten().fieldErrors };

  const h = await headers();
  const ip = clientIpFromHeaders(h);
  if (isRateLimited(`event-submit:${ip}`, 10, 10 * 60 * 1000)) {
    return { error: { _form: ["Too many attempts — please wait a few minutes and try again."] } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: signupParsed.data.email,
    password: signupParsed.data.password,
  });

  if (error) {
    console.error("Event organiser signup failed", error);
    return { error: { _form: ["Something went wrong — please try again."] } };
  }
  // Documented Supabase anti-enumeration behavior: an already-registered
  // email comes back as a "successful" user with an empty identities array
  // rather than a clear error.
  if (!data.user || data.user.identities?.length === 0) {
    return { error: { _form: ["That email already has an account — log in instead."] } };
  }

  const admin = createAdminClient();
  const { data: account, error: insertAccountError } = await admin
    .from("event_organizers")
    .insert({ user_id: data.user.id })
    .select("id")
    .single();
  if (insertAccountError || !account) {
    console.error("Failed to create event_organizers row", insertAccountError);
    return { error: { _form: ["Something went wrong — please try again."] } };
  }

  return insertEvent(account.id, eventParsed.data);
}

// Returning organiser with an existing, already-confirmed login (either a
// prior event organiser, or an existing Growth business owner logging in
// with their business credentials right here). signInWithPassword fails
// outright for an unconfirmed email when Supabase's "Confirm email"
// project setting is on, so a successful login here already proves the
// account is real and confirmed.
export async function submitEventExistingOrganizer(
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const eventParsed = parseEventFields(formData);

  if (!email || !password) return { error: { _form: ["Enter your email and password."] } };
  if (!eventParsed.success) return { error: eventParsed.error.flatten().fieldErrors };

  const h = await headers();
  const ip = clientIpFromHeaders(h);
  if (isRateLimited(`event-login:${ip}`, 10, 10 * 60 * 1000)) {
    return { error: { _form: ["Too many attempts — please wait a few minutes and try again."] } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { error: { _form: ["Incorrect email or password."] } };
  }

  const organizerAccountId = await getOrCreateOrganizerAccount(data.user.id);
  if (!organizerAccountId) {
    return { error: { _form: ["Something went wrong — please try again."] } };
  }

  return insertEvent(organizerAccountId, eventParsed.data);
}

// Already-signed-in visitor (typically a Growth business owner browsing
// with an active session) — no email/password fields needed at all, the
// form simply doesn't render the account tabs when a session already
// exists (checked server-side by the page itself before rendering).
export async function submitEventAsLoggedInUser(_prevState: EventFormState, formData: FormData): Promise<EventFormState> {
  const eventParsed = parseEventFields(formData);
  if (!eventParsed.success) return { error: eventParsed.error.flatten().fieldErrors };

  const h = await headers();
  const ip = clientIpFromHeaders(h);
  if (isRateLimited(`event-submit:${ip}`, 10, 10 * 60 * 1000)) {
    return { error: { _form: ["Too many attempts — please wait a few minutes and try again."] } };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: { _form: ["Your session has expired — please reload and sign in again."] } };
  }

  const organizerAccountId = await getOrCreateOrganizerAccount(user.id);
  if (!organizerAccountId) {
    return { error: { _form: ["Something went wrong — please try again."] } };
  }

  return insertEvent(organizerAccountId, eventParsed.data);
}

type VerifyOtpState = { error?: string; success?: boolean } | null;

// Confirms the organiser's email via the 6-digit "Confirm signup" code —
// same shape as Rate & Review's verifyReviewerSignupOtp. Their event is
// already live by the time this runs (see submitEventNewOrganizer above);
// this only secures their ability to log back in with this account later.
export async function verifyEventOrganizerSignupOtp(_prevState: VerifyOtpState, formData: FormData): Promise<VerifyOtpState> {
  const email = String(formData.get("email") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();
  if (!email || !token) {
    return { error: "Enter the code from your email." };
  }

  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`event-organizer-otp:${ip}`, 10, 10 * 60 * 1000)) {
    return { error: "Too many attempts — please wait a few minutes and try again." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });

  if (error || !data.user) {
    return { error: "That code is incorrect or has expired — check your email for the latest one." };
  }

  return { success: true };
}
