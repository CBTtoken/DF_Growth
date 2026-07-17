"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { organizerSignupSchema, eventSubmissionSchema } from "@/lib/schemas/events";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { detectSpamSignal, detectThinListing } from "@/lib/events/spam-check";

type EventFormState =
  | {
      error?: Record<string, string[]> & { _form?: string[] };
      success?: boolean;
      eventId?: string;
      needsReview?: boolean;
    }
  | null;

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function parseEventFields(formData: FormData) {
  return eventSubmissionSchema.safeParse({
    eventName: formData.get("eventName"),
    description: formData.get("description"),
    startDate: formData.get("startDate"),
    startTime: formData.get("startTime"),
    endDate: formData.get("endDate"),
    endTime: formData.get("endTime"),
    locationAddress: formData.get("locationAddress"),
    city: formData.get("city"),
    eventType: formData.get("eventType"),
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    contactWhatsapp: formData.get("contactWhatsapp"),
    facebookUrl: formData.get("facebookUrl"),
    instagramUrl: formData.get("instagramUrl"),
    websiteUrl: formData.get("websiteUrl"),
    ticketInfoText: formData.get("ticketInfoText"),
    bookingUrl: formData.get("bookingUrl"),
  });
}

// Combines the separate date + time inputs back into one Date — see the
// schema comment for why they're separate fields in the first place. Only
// ever called with a valid (non-empty) date/time pair; the caller decides
// whether the end pair was actually provided at all.
function combineDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}`);
}

// Sec 3: "a few images, reusing Growth's existing photo upload... pattern."
// Unlike client_photos' upload-on-select flow (which needs an
// already-valid session per request), files here are deferred until the
// whole form submits — by then the organizer_account_id this function
// receives is already resolved, so there's exactly one write path instead
// of a pre-auth upload step. A bad individual photo (wrong type, too big)
// is silently skipped rather than failing the whole submission over it —
// the event itself is what the visitor came here for.
async function uploadEventImages(organizerAccountId: string, formData: FormData): Promise<string[]> {
  const admin = createAdminClient();
  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  const paths: string[] = [];

  for (const file of files.slice(0, MAX_IMAGES)) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_BYTES) continue;

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${organizerAccountId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await admin.storage.from("event-photos").upload(path, file, { contentType: file.type });
    if (!error) paths.push(path);
  }

  return paths;
}

// Sec 6: Turnstile is checked by each submit action before this ever runs
// (a missing/invalid token rejects outright, no row ever created — see
// each submit* function below). This is the one write path every submit
// action funnels through once it has a resolved organizer_account_id and
// a passing Turnstile check; the basic completeness/spam-pattern check
// happens here, deciding auto-publish vs. manual review.
async function insertEvent(
  organizerAccountId: string,
  data: ReturnType<typeof parseEventFields>["data"],
  formData: FormData
): Promise<EventFormState> {
  if (!data) return { error: { _form: ["Something went wrong — please try again."] } };

  const images = await uploadEventImages(organizerAccountId, formData);

  const startDatetime = combineDateTime(data.startDate, data.startTime);
  if (Number.isNaN(startDatetime.getTime())) {
    return { error: { _form: ["Enter a valid start date and time."] } };
  }
  // Only combined into an end datetime when both halves were actually
  // given — a lone date or lone time (the other left blank) is treated as
  // "no end time provided" rather than guessing the missing half.
  const endDatetime = data.endDate && data.endTime ? combineDateTime(data.endDate, data.endTime) : null;

  // Sec 6: "clean submissions... auto-publish immediately... anything that
  // fails those checks... routes to a manual admin review queue before it
  // goes live." Unlike Rate & Review's flags (orthogonal to an
  // already-published review, deliberately never hiding one a business
  // didn't like), this gates publication itself — the submitter's own
  // brand-new event has never been visible to anyone yet, so holding it
  // for a quick human check costs nothing a real organiser would notice.
  const needsReview =
    detectSpamSignal({ eventName: data.eventName, description: data.description ?? "" }) ??
    detectThinListing({ description: data.description ?? "", imageCount: images.length });

  const admin = createAdminClient();
  const { data: inserted, error } = await admin
    .from("events")
    .insert({
      organizer_account_id: organizerAccountId,
      event_name: data.eventName,
      description: data.description || null,
      start_datetime: startDatetime.toISOString(),
      end_datetime: endDatetime ? endDatetime.toISOString() : null,
      location_address: data.locationAddress || null,
      city: data.city,
      event_type: data.eventType,
      social_links: {
        facebook: data.facebookUrl || null,
        instagram: data.instagramUrl || null,
        website: data.websiteUrl || null,
      },
      contact_details: {
        name: data.contactName || null,
        email: data.contactEmail,
        phone: data.contactPhone || null,
        whatsapp: data.contactWhatsapp || null,
      },
      images,
      ticket_info_text: data.ticketInfoText || null,
      booking_url: data.bookingUrl || null,
      status: needsReview ? "pending_review" : "published",
      ...(needsReview && {
        flagged_by: "system",
        flagged_reason: needsReview,
        flagged_at: new Date().toISOString(),
      }),
    })
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("Failed to create event", error);
    return { error: { _form: ["Something went wrong saving your event — please try again."] } };
  }

  return { success: true, eventId: inserted.id, needsReview: !!needsReview };
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

  const turnstileOk = await verifyTurnstileToken(String(formData.get("turnstileToken") ?? ""), ip);
  if (!turnstileOk) {
    return { error: { _form: ["Verification failed — please try again."] } };
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

  return insertEvent(account.id, eventParsed.data, formData);
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

  const turnstileOk = await verifyTurnstileToken(String(formData.get("turnstileToken") ?? ""), ip);
  if (!turnstileOk) {
    return { error: { _form: ["Verification failed — please try again."] } };
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

  return insertEvent(organizerAccountId, eventParsed.data, formData);
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

  const turnstileOk = await verifyTurnstileToken(String(formData.get("turnstileToken") ?? ""), ip);
  if (!turnstileOk) {
    return { error: { _form: ["Verification failed — please try again."] } };
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

  return insertEvent(organizerAccountId, eventParsed.data, formData);
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

type ReportEventState = { error?: string; success?: boolean } | null;

// Sec 6: "a 'report this event' flag, visible on every public event page,
// routes to the same admin queue" — no login required, matches the spec's
// "visible on every public event page" framing rather than gating it
// behind an account. `.is("flagged_by", null)` guards against a report
// piling on top of one already in the queue, same pattern as reviews'
// business-flag action.
export async function reportEvent(eventId: string, _prevState: ReportEventState, formData: FormData): Promise<ReportEventState> {
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) {
    return { error: "Tell us briefly why you're reporting this event." };
  }

  const h = await headers();
  const ip = clientIpFromHeaders(h);
  if (isRateLimited(`event-report:${ip}`, 5, 10 * 60 * 1000)) {
    return { error: "Too many reports — please wait a few minutes and try again." };
  }

  const admin = createAdminClient();
  const { data: updated } = await admin
    .from("events")
    .update({ flagged_by: "public", flagged_reason: reason, flagged_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("status", "published")
    .is("flagged_by", null)
    .select("id")
    .maybeSingle();

  if (!updated) {
    // Already flagged, already removed, or a stale/bad id — same
    // reassuring response either way, rather than leaking which case it
    // was to an anonymous reporter.
    return { success: true };
  }

  return { success: true };
}
