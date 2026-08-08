"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { startGatewayPayment } from "@/lib/shop/gateway";
import { getStaysOwnerWithGateway, getTourBySlug } from "@/lib/stays/queries";
import { stayHoldSchema, tourHoldSchema, waitlistSchema, guestMessageSchema } from "@/lib/schemas/stays";
import { depositCents as calcDeposit, longDate, nightsBetween, todayInSA } from "@/lib/stays/money";
import { HOLD_MINUTES } from "@/lib/stays/expire-holds";
import { confirmToGuest, describeStay, notifyOwnerOfBooking, notifyOwnerOfWaitlist } from "@/lib/stays/notify";
import { SHARED_COPY } from "@/lib/stays/copy";
import { rememberVisitor, resolveVisitor } from "@/lib/board/visitor";
import { sendChatMessage } from "@/lib/board/chat";

// Everything a guest can do, and nothing a member can.
//
// Every action here is reachable by a stranger with no account, so every
// one of them verifies a Turnstile token against Cloudflare before it does
// anything (HOUSE-RULES.md: both halves, or it does not work). The
// in-memory rate limit sits on top of that and is not a substitute for it:
// it lives in one serverless instance's memory and resets on every cold
// start.
//
// The second rule running through the whole file: every price, every rate
// and every deposit is read from the database, never from the submitted
// form. What the browser sends is a statement of what somebody wants, not a
// claim about what it costs.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://growth.digitalflyersa.co.za";

export type StayHoldState =
  | { error?: Record<string, string[]> & { _form?: string[] }; redirectTo?: string; external?: boolean }
  | null;

function guestToken(prefix: "s" | "t"): string {
  return prefix + crypto.randomBytes(24).toString("hex");
}

/**
 * Holds a room and sends the guest to pay the deposit.
 *
 * The hold and the availability check happen inside one database function
 * that has already locked the room type, so two people pressing at the same
 * second cannot both take the last room. Doing the count here in TypeScript
 * and then inserting would read "one free" twice and write twice, which is
 * exactly acceptance criterion 4.
 */
export async function holdStay(
  clientSlug: string,
  _prevState: StayHoldState,
  formData: FormData
): Promise<StayHoldState> {
  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`stay-hold:${ip}`, 6, 10 * 60 * 1000)) {
    return { error: { _form: [SHARED_COPY.tooManyTries] } };
  }

  const turnstileOk = await verifyTurnstileToken(String(formData.get("turnstileToken") ?? ""), ip);
  if (!turnstileOk) return { error: { _form: [SHARED_COPY.botCheckFailed] } };

  const parsed = stayHoldSchema.safeParse({
    roomTypeId: formData.get("roomTypeId"),
    checkIn: formData.get("checkIn"),
    checkOut: formData.get("checkOut"),
    adults: formData.get("adults") || 1,
    children: formData.get("children") || 0,
    guestName: formData.get("guestName"),
    guestEmail: formData.get("guestEmail"),
    guestPhone: formData.get("guestPhone"),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  // Nobody books yesterday. Checked server-side because a date input's own
  // min attribute is a suggestion to a browser, not a rule.
  if (parsed.data.checkIn < todayInSA()) {
    return { error: { checkIn: ["Choose a date from today onwards"] } };
  }

  const owner = await getStaysOwnerWithGateway(clientSlug);
  if (!owner) return { error: { _form: [SHARED_COPY.noLongerAvailable] } };

  const admin = createAdminClient();
  const { data: roomType } = await admin
    .from("stays_room_types")
    .select("id, name, rate_cents, max_adults, max_children, deposit_kind, deposit_percent, deposit_fixed_cents")
    .eq("id", parsed.data.roomTypeId)
    .eq("growth_client_id", owner.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!roomType?.rate_cents) return { error: { _form: [SHARED_COPY.noLongerAvailable] } };

  // The capacity rule again, on the way in. Search already filters on it,
  // but search runs on a URL anybody can edit.
  if (parsed.data.adults > roomType.max_adults || parsed.data.children > roomType.max_children) {
    return { error: { _form: ["That room does not take a party of that size."] } };
  }

  const nights = nightsBetween(parsed.data.checkIn, parsed.data.checkOut);
  if (nights < 1 || nights > 90) return { error: { checkOut: ["Choose between 1 and 90 nights"] } };

  const totalCents = roomType.rate_cents * nights;
  const depositCents = calcDeposit(
    totalCents,
    roomType.deposit_kind === "fixed" ? "fixed" : "percent",
    roomType.deposit_percent,
    roomType.deposit_fixed_cents
  );

  const token = guestToken("s");
  const reference = `dfstay_${crypto.randomUUID().replace(/-/g, "")}`;

  const { data: bookingId, error } = await admin.rpc("stays_create_hold", {
    p_growth_client_id: owner.id,
    p_room_type_id: roomType.id,
    p_check_in: parsed.data.checkIn,
    p_check_out: parsed.data.checkOut,
    p_units: 1,
    p_adults: parsed.data.adults,
    p_children: parsed.data.children,
    p_guest_name: parsed.data.guestName,
    p_guest_email: parsed.data.guestEmail,
    p_guest_phone: parsed.data.guestPhone,
    p_nightly_rate_cents: roomType.rate_cents,
    p_nights: nights,
    p_total_cents: totalCents,
    p_deposit_cents: depositCents,
    p_guest_token: token,
    p_payment_reference: reference,
    p_hold_minutes: HOLD_MINUTES,
  });

  if (error || !bookingId) {
    if (error?.message?.includes("not_available")) {
      return { error: { _form: ["Somebody just took the last one for those dates. Please try other dates."] } };
    }
    if (error?.message?.includes("room_unavailable")) {
      return { error: { _form: [SHARED_COPY.noLongerAvailable] } };
    }
    console.error("Could not hold a room", error);
    return { error: { _form: [SHARED_COPY.somethingWentWrong] } };
  }

  const confirmationPath = `/${clientSlug}/confirmation/${token}`;

  if (owner.hasGateway && depositCents > 0) {
    const payment = await startGatewayPayment({
      growthClientId: owner.id,
      email: parsed.data.guestEmail,
      phone: parsed.data.guestPhone,
      amountCents: depositCents,
      reference,
      itemName: `Deposit for ${roomType.name} at ${owner.businessName}`,
      returnUrl: `${SITE_URL}${confirmationPath}`,
      notifyUrl: `${SITE_URL}/api/webhooks/bobpay`,
    });

    if ("authorizationUrl" in payment) {
      await admin.from("stays_bookings").update({ gateway: payment.provider }).eq("id", bookingId);
      return { redirectTo: payment.authorizationUrl, external: true };
    }
    // A gateway that will not open a transaction must not strand a guest on
    // a dead end. The booking already exists, so it falls through to the
    // unpaid path below and the member is told to arrange payment. A
    // booking that completes awkwardly beats a booking that vanishes.
  }

  await confirmWithoutPayment(owner, String(bookingId), "stay", {
    what: roomType.name,
    when: describeStay(parsed.data.checkIn, parsed.data.checkOut, nights),
    guestName: parsed.data.guestName,
    guestEmail: parsed.data.guestEmail,
    guestPhone: parsed.data.guestPhone,
    totalCents,
    depositCents,
    confirmationUrl: `${SITE_URL}${confirmationPath}`,
  });

  revalidatePath(`/${clientSlug}`);
  return { redirectTo: confirmationPath };
}

/** Books seats on a tour, same shape and the same guarantees. */
export async function holdTourSeats(
  clientSlug: string,
  tourSlug: string,
  _prevState: StayHoldState,
  formData: FormData
): Promise<StayHoldState> {
  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`tour-hold:${ip}`, 6, 10 * 60 * 1000)) {
    return { error: { _form: [SHARED_COPY.tooManyTries] } };
  }

  const turnstileOk = await verifyTurnstileToken(String(formData.get("turnstileToken") ?? ""), ip);
  if (!turnstileOk) return { error: { _form: [SHARED_COPY.botCheckFailed] } };

  const parsed = tourHoldSchema.safeParse({
    tourId: formData.get("tourId"),
    seats: formData.get("seats") || 1,
    guestName: formData.get("guestName"),
    guestEmail: formData.get("guestEmail"),
    guestPhone: formData.get("guestPhone"),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const owner = await getStaysOwnerWithGateway(clientSlug);
  if (!owner) return { error: { _form: [SHARED_COPY.noLongerAvailable] } };

  const tour = await getTourBySlug(owner.id, tourSlug);
  if (!tour || !tour.isPublished || tour.id !== parsed.data.tourId) {
    return { error: { _form: [SHARED_COPY.noLongerAvailable] } };
  }
  if (tour.departureDate < todayInSA()) {
    return { error: { _form: ["This trip has already run. Look out for the next date."] } };
  }

  const totalCents = tour.priceCents * parsed.data.seats;
  const depositCents = calcDeposit(totalCents, tour.depositKind, tour.depositPercent, tour.depositFixedCents);

  const token = guestToken("t");
  const reference = `dftour_${crypto.randomUUID().replace(/-/g, "")}`;
  const admin = createAdminClient();

  const { data: bookingId, error } = await admin.rpc("tours_create_hold", {
    p_growth_client_id: owner.id,
    p_tour_id: tour.id,
    p_seats: parsed.data.seats,
    p_guest_name: parsed.data.guestName,
    p_guest_email: parsed.data.guestEmail,
    p_guest_phone: parsed.data.guestPhone,
    p_price_cents: tour.priceCents,
    p_total_cents: totalCents,
    p_deposit_cents: depositCents,
    p_guest_token: token,
    p_payment_reference: reference,
    p_hold_minutes: HOLD_MINUTES,
  });

  if (error || !bookingId) {
    if (error?.message?.includes("not_available")) {
      return { error: { _form: ["There are not that many seats left. Please try fewer."] } };
    }
    console.error("Could not hold tour seats", error);
    return { error: { _form: [SHARED_COPY.somethingWentWrong] } };
  }

  const confirmationPath = `/${clientSlug}/confirmation/${token}`;
  const when = `${longDate(tour.departureDate)}${tour.departureTime ? `, ${tour.departureTime}` : ""}`;

  if (owner.hasGateway && depositCents > 0) {
    const payment = await startGatewayPayment({
      growthClientId: owner.id,
      email: parsed.data.guestEmail,
      phone: parsed.data.guestPhone,
      amountCents: depositCents,
      reference,
      itemName: `${tour.title} with ${owner.businessName}`,
      returnUrl: `${SITE_URL}${confirmationPath}`,
      notifyUrl: `${SITE_URL}/api/webhooks/bobpay`,
    });

    if ("authorizationUrl" in payment) {
      await admin.from("tours_bookings").update({ gateway: payment.provider }).eq("id", bookingId);
      return { redirectTo: payment.authorizationUrl, external: true };
    }
  }

  await confirmWithoutPayment(owner, String(bookingId), "tour", {
    what: `${tour.title}, ${parsed.data.seats} ${parsed.data.seats === 1 ? "seat" : "seats"}`,
    when,
    guestName: parsed.data.guestName,
    guestEmail: parsed.data.guestEmail,
    guestPhone: parsed.data.guestPhone,
    totalCents,
    depositCents,
    confirmationUrl: `${SITE_URL}${confirmationPath}`,
  });

  revalidatePath(`/${clientSlug}/tours/${tourSlug}`);
  return { redirectTo: confirmationPath };
}

/**
 * A booking made by a member who cannot take payment online yet.
 *
 * This is the normal case rather than the fallback, exactly as it is in the
 * shop: most members have not connected a gateway. The booking is real, the
 * dates are held, the member is emailed, and the guest is told plainly that
 * the owner will be in touch about payment. Nothing pretends money changed
 * hands.
 */
async function confirmWithoutPayment(
  owner: Awaited<ReturnType<typeof getStaysOwnerWithGateway>> & object,
  bookingId: string,
  kind: "stay" | "tour",
  facts: {
    what: string;
    when: string;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    totalCents: number;
    depositCents: number;
    confirmationUrl: string;
  }
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from(kind === "stay" ? "stays_bookings" : "tours_bookings")
    .update({ status: "confirmed", hold_expires_at: null })
    .eq("id", bookingId);

  const payload = {
    businessName: owner.businessName,
    ownerEmail: owner.contactEmail,
    guestName: facts.guestName,
    guestEmail: facts.guestEmail,
    guestPhone: facts.guestPhone,
    what: facts.what,
    when: facts.when,
    totalCents: facts.totalCents,
    depositCents: facts.depositCents,
    paid: false,
    balanceDueDays: owner.property.balanceDueDays,
    confirmationUrl: facts.confirmationUrl,
    cancellationTerms: owner.property.cancellationTerms,
  };

  await Promise.all([notifyOwnerOfBooking(payload), confirmToGuest(payload)]);
}

export type WaitlistState = { error?: string; sent?: boolean } | null;

/** The list a fully booked tour collects instead of showing a dead end. */
export async function joinTourWaitlist(
  clientSlug: string,
  _prevState: WaitlistState,
  formData: FormData
): Promise<WaitlistState> {
  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`tour-waitlist:${ip}`, 5, 15 * 60 * 1000)) return { error: SHARED_COPY.tooManyTries };

  const turnstileOk = await verifyTurnstileToken(String(formData.get("turnstileToken") ?? ""), ip);
  if (!turnstileOk) return { error: SHARED_COPY.botCheckFailed };

  const parsed = waitlistSchema.safeParse({
    tourId: formData.get("tourId"),
    name: formData.get("name"),
    email: formData.get("email") || "",
    phone: formData.get("phone") || "",
    people: formData.get("people") || 1,
    note: formData.get("note") || "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? SHARED_COPY.somethingWentWrong };

  // One of the two, or the member has no way to answer. Deliberately not
  // both: asking for everything is how a form stops being filled in.
  if (!parsed.data.email && !parsed.data.phone) {
    return { error: "Leave an email address or a phone number so we can reach you." };
  }

  const owner = await getStaysOwnerWithGateway(clientSlug);
  if (!owner) return { error: SHARED_COPY.noLongerAvailable };

  const admin = createAdminClient();
  const { data: tour } = await admin
    .from("tours")
    .select("id, title")
    .eq("id", parsed.data.tourId)
    .eq("growth_client_id", owner.id)
    .eq("is_published", true)
    .maybeSingle();

  if (!tour) return { error: SHARED_COPY.noLongerAvailable };

  const { error } = await admin.from("tours_waitlist").insert({
    growth_client_id: owner.id,
    tour_id: tour.id,
    name: parsed.data.name,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    people: parsed.data.people,
    note: parsed.data.note || null,
  });

  if (error) {
    console.error("Could not join the tour waiting list", error);
    return { error: SHARED_COPY.somethingWentWrong };
  }

  await notifyOwnerOfWaitlist({
    ownerEmail: owner.contactEmail,
    tourTitle: tour.title,
    name: parsed.data.name,
    contact: parsed.data.email || parsed.data.phone || "",
    people: parsed.data.people,
  });

  return { sent: true };
}

export type GuestMessageState = { error?: string; sent?: boolean } | null;

/**
 * The guest's message to the member, through Growth Chat.
 *
 * Handoff Job 7. Reachable only from a confirmation page, which needs the
 * booking's own unguessable token, so there is no way to message a member
 * through this route without having actually booked with them. The link is
 * offered after booking and never before payment.
 *
 * The member is notified by email and replies inside Growth, in the same
 * inbox they already use for the Board. Nothing here touches WhatsApp and
 * there is nothing for the member to set up.
 */
export async function sendGuestMessage(
  clientSlug: string,
  _prevState: GuestMessageState,
  formData: FormData
): Promise<GuestMessageState> {
  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`stay-chat:${ip}`, 20, 10 * 60 * 1000)) return { error: SHARED_COPY.tooManyTries };

  const turnstileOk = await verifyTurnstileToken(String(formData.get("turnstileToken") ?? ""), ip);
  if (!turnstileOk) return { error: SHARED_COPY.botCheckFailed };

  const parsed = guestMessageSchema.safeParse({
    token: formData.get("token"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? SHARED_COPY.somethingWentWrong };

  const owner = await getStaysOwnerWithGateway(clientSlug);
  if (!owner) return { error: SHARED_COPY.noLongerAvailable };

  const admin = createAdminClient();
  const table = parsed.data.token.startsWith("t") ? "tours_bookings" : "stays_bookings";
  const { data: booking } = await admin
    .from(table)
    .select("id, guest_name, guest_email, status, chat_thread_id")
    .eq("guest_token", parsed.data.token)
    .eq("growth_client_id", owner.id)
    .maybeSingle();

  // A held booking is one nobody has paid for yet. Chat opens after
  // booking, on the confirmation, not before.
  if (!booking || booking.status !== "confirmed") return { error: SHARED_COPY.noLongerAvailable };

  const identityId = await guestIdentity(booking.guest_name, booking.guest_email);
  if (!identityId) return { error: SHARED_COPY.somethingWentWrong };

  const sent = await sendChatMessage({
    growthClientId: owner.id,
    identityId,
    sender: "public",
    body: parsed.data.body,
  });

  if ("error" in sent) return { error: sent.error };

  // The conversation is attached to the booking so the history sits with
  // it, which is the whole point of doing this here rather than pointing a
  // guest at a general contact form.
  if (booking.chat_thread_id !== sent.threadId) {
    await admin.from(table).update({ chat_thread_id: sent.threadId }).eq("id", booking.id);
  }

  return { sent: true };
}

/**
 * The board identity behind a guest, found or created, and never renamed.
 *
 * This does deliberately less than resolveVisitor, which is the Board's own
 * helper, and the difference is a real bug found by walking this flow rather
 * than reading it. resolveVisitor keys on email and UPDATES display_name to
 * whatever the caller passed. That is right on the Board, where the person
 * typing the name is the person it belongs to. It is wrong here: the name on
 * a booking is whatever the guest typed into a hotel form, and letting it
 * overwrite an existing identity means one booking silently renames that
 * person everywhere they have ever posted.
 *
 * It happened during this sprint's own testing, on a live identity with two
 * published Board posts against it, which is exactly how a real guest
 * booking from an address they had once used on the Board would have
 * renamed themselves without knowing.
 *
 * So an existing identity is used as it stands, and only a brand new one
 * takes its name from the booking.
 */
async function guestIdentity(guestName: string, guestEmail: string | null): Promise<string | null> {
  const admin = createAdminClient();
  const email = guestEmail?.trim().toLowerCase() || null;

  if (email) {
    const { data: existing } = await admin
      .from("board_identities")
      .select("id, blocked_at")
      .eq("email", email)
      .maybeSingle();

    // A blocked person is treated exactly like a stranger rather than being
    // told they are blocked, same as everywhere else on the Board.
    if (existing?.blocked_at) return null;
    if (existing) {
      await rememberVisitor(existing.id);
      return existing.id;
    }
  }

  const created = await resolveVisitor({ displayName: guestName, email });
  return "error" in created ? null : created.visitor.id;
}
