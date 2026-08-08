"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { cleanAmenities } from "@/lib/stays/amenities";
import { blockSchema, cancelBookingSchema, propertySchema, roomTypeSchema, tourSchema } from "@/lib/schemas/stays";
import { slugify } from "@/lib/slugify";

// Everything the member does to their own Stays and Tours.
//
// Handoff acceptance criterion 15: "The member can change every rate, room
// type, amenity, tour and term himself with no admin involvement." So there
// is no admin screen for any of this and no support ticket in the middle of
// it. Every action below starts from the member's own session and can only
// ever touch rows carrying their own growth_client_id.

export type ActionState = { error?: Record<string, string[]> & { _form?: string[] }; saved?: boolean } | null;

const GENERIC_ERROR = { _form: ["Could not save that, please try again."] };

async function me(): Promise<string | null> {
  const client = await requireGrowthClientId();
  return client.error ? null : (client.id ?? null);
}

function refresh() {
  revalidatePath("/dashboard/stays");
  // The public page reads room types, tours and the property settings, so a
  // rate changed here has to reach it rather than waiting out the page's
  // sixty second revalidate window.
  revalidatePath("/[clientSlug]", "page");
}

/** Property settings, amenities and the terms a guest is shown. */
export async function saveProperty(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const growthClientId = await me();
  if (!growthClientId) return { error: { _form: ["Please log in again."] } };

  const parsed = propertySchema.safeParse({
    intro: formData.get("intro") ?? "",
    checkInFrom: formData.get("checkInFrom") ?? "",
    checkOutBy: formData.get("checkOutBy") ?? "",
    balanceDueDays: formData.get("balanceDueDays") ?? 7,
    cancellationTerms: formData.get("cancellationTerms") ?? "",
    amenities: cleanAmenities(formData.getAll("amenities").map(String), "property"),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const admin = createAdminClient();
  const { error } = await admin.from("stays_properties").upsert(
    {
      growth_client_id: growthClientId,
      intro: parsed.data.intro || null,
      check_in_from: parsed.data.checkInFrom || null,
      check_out_by: parsed.data.checkOutBy || null,
      balance_due_days: parsed.data.balanceDueDays,
      cancellation_terms: parsed.data.cancellationTerms || null,
      amenities: parsed.data.amenities,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "growth_client_id" }
  );

  if (error) {
    console.error("Could not save stays property", error);
    return { error: GENERIC_ERROR };
  }

  refresh();
  return { saved: true };
}

/** The switch that puts the two sections on the member's page, or takes them off. */
export async function setStaysEnabled(enabled: boolean): Promise<ActionState> {
  const growthClientId = await me();
  if (!growthClientId) return { error: { _form: ["Please log in again."] } };

  const admin = createAdminClient();
  const { error } = await admin
    .from("stays_properties")
    .upsert(
      { growth_client_id: growthClientId, enabled, updated_at: new Date().toISOString() },
      { onConflict: "growth_client_id" }
    );

  if (error) {
    console.error("Could not switch Stays and Tours", error);
    return { error: GENERIC_ERROR };
  }

  refresh();
  return { saved: true };
}

/** Creates or updates one room type. */
export async function saveRoomType(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const growthClientId = await me();
  if (!growthClientId) return { error: { _form: ["Please log in again."] } };

  const roomTypeId = String(formData.get("roomTypeId") ?? "").trim();
  const rawRate = String(formData.get("rate") ?? "").trim();

  const parsed = roomTypeSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    maxAdults: formData.get("maxAdults") ?? 2,
    maxChildren: formData.get("maxChildren") ?? 0,
    unitsCount: formData.get("unitsCount") ?? 1,
    rate: rawRate === "" ? "" : rawRate,
    depositKind: formData.get("depositKind") ?? "percent",
    depositPercent: formData.get("depositPercent") ?? 50,
    depositFixed: formData.get("depositFixed") ?? 0,
    amenities: cleanAmenities(formData.getAll("amenities").map(String), "room"),
    photoIds: formData.getAll("photoIds").map(String).filter(Boolean),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  // Rands in, cents stored. An empty rate stays null, which is what keeps a
  // described-but-not-yet-priced room out of every guest's search.
  const rateCents =
    parsed.data.rate === "" || parsed.data.rate === undefined ? null : Math.round(Number(parsed.data.rate) * 100);

  const row = {
    growth_client_id: growthClientId,
    name: parsed.data.name,
    description: parsed.data.description || null,
    max_adults: parsed.data.maxAdults,
    max_children: parsed.data.maxChildren,
    units_count: parsed.data.unitsCount,
    rate_cents: rateCents,
    deposit_kind: parsed.data.depositKind,
    deposit_percent: parsed.data.depositPercent,
    deposit_fixed_cents: Math.round(parsed.data.depositFixed * 100),
    amenities: parsed.data.amenities,
    photo_ids: parsed.data.photoIds,
    updated_at: new Date().toISOString(),
  };

  const admin = createAdminClient();
  const { error } = roomTypeId
    ? // .eq on growth_client_id as well as id, always. An id in a form field
      // is a value a browser sent, and one member must never be able to
      // rename another member's room by editing it.
      await admin.from("stays_room_types").update(row).eq("id", roomTypeId).eq("growth_client_id", growthClientId)
    : await admin.from("stays_room_types").insert(row);

  if (error) {
    console.error("Could not save a room type", error);
    return { error: GENERIC_ERROR };
  }

  refresh();
  return { saved: true };
}

/**
 * Takes a room type off the page.
 *
 * Never a delete. A room type with bookings against it is referenced by
 * those bookings (on delete restrict), and a member who stops offering the
 * family room in winter should not lose the record of who slept in it.
 * Switching it off removes it from every search and leaves the history
 * intact, which is what "remove" means to the person pressing it.
 */
export async function retireRoomType(roomTypeId: string): Promise<ActionState> {
  const growthClientId = await me();
  if (!growthClientId) return { error: { _form: ["Please log in again."] } };

  const admin = createAdminClient();
  const { error } = await admin
    .from("stays_room_types")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", roomTypeId)
    .eq("growth_client_id", growthClientId);

  if (error) {
    console.error("Could not retire a room type", error);
    return { error: GENERIC_ERROR };
  }

  refresh();
  return { saved: true };
}

export async function restoreRoomType(roomTypeId: string): Promise<ActionState> {
  const growthClientId = await me();
  if (!growthClientId) return { error: { _form: ["Please log in again."] } };

  const admin = createAdminClient();
  await admin
    .from("stays_room_types")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", roomTypeId)
    .eq("growth_client_id", growthClientId);

  refresh();
  return { saved: true };
}

/** Creates or updates one tour. */
export async function saveTour(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const growthClientId = await me();
  if (!growthClientId) return { error: { _form: ["Please log in again."] } };

  const tourId = String(formData.get("tourId") ?? "").trim();

  const parsed = tourSchema.safeParse({
    title: formData.get("title"),
    summary: formData.get("summary") ?? "",
    description: formData.get("description") ?? "",
    itinerary: formData.get("itinerary") ?? "",
    meetingPoint: formData.get("meetingPoint") ?? "",
    departureDate: formData.get("departureDate"),
    departureTime: formData.get("departureTime") ?? "",
    durationText: formData.get("durationText") ?? "",
    price: formData.get("price") ?? 0,
    seatsTotal: formData.get("seatsTotal") ?? 1,
    depositKind: formData.get("depositKind") ?? "percent",
    depositPercent: formData.get("depositPercent") ?? 50,
    depositFixed: formData.get("depositFixed") ?? 0,
    photoIds: formData.getAll("photoIds").map(String).filter(Boolean),
    isPublished: formData.get("isPublished") === "on" || formData.get("isPublished") === "true",
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const admin = createAdminClient();

  const row = {
    growth_client_id: growthClientId,
    title: parsed.data.title,
    summary: parsed.data.summary || null,
    description: parsed.data.description || null,
    itinerary: parsed.data.itinerary || null,
    meeting_point: parsed.data.meetingPoint || null,
    departure_date: parsed.data.departureDate,
    departure_time: parsed.data.departureTime || null,
    duration_text: parsed.data.durationText || null,
    price_cents: Math.round(parsed.data.price * 100),
    seats_total: parsed.data.seatsTotal,
    deposit_kind: parsed.data.depositKind,
    deposit_percent: parsed.data.depositPercent,
    deposit_fixed_cents: Math.round(parsed.data.depositFixed * 100),
    photo_ids: parsed.data.photoIds,
    is_published: parsed.data.isPublished,
    updated_at: new Date().toISOString(),
  };

  if (tourId) {
    // The slug is never changed on an existing tour. It is the URL the
    // member has already shared and Google has already indexed, and a
    // renamed title must not quietly break every link to it.
    const { error } = await admin.from("tours").update(row).eq("id", tourId).eq("growth_client_id", growthClientId);
    if (error) {
      console.error("Could not save a tour", error);
      return { error: GENERIC_ERROR };
    }
  } else {
    const slug = await uniqueTourSlug(growthClientId, parsed.data.title, parsed.data.departureDate);
    const { error } = await admin.from("tours").insert({ ...row, slug });
    if (error) {
      console.error("Could not create a tour", error);
      return { error: GENERIC_ERROR };
    }
  }

  refresh();
  return { saved: true };
}

/** A readable, stable, unique-per-member slug for a tour's own page. */
async function uniqueTourSlug(growthClientId: string, title: string, departureDate: string): Promise<string> {
  const admin = createAdminClient();
  const base = slugify(title) || "tour";
  const candidates = [base, `${base}-${departureDate.slice(0, 7)}`, `${base}-${departureDate}`];

  const { data: taken } = await admin.from("tours").select("slug").eq("growth_client_id", growthClientId);
  const used = new Set((taken ?? []).map((row) => row.slug));

  for (const candidate of candidates) {
    if (!used.has(candidate)) return candidate;
  }
  // Two trips with the same name on the same day is somebody testing.
  for (let i = 2; i < 50; i += 1) {
    const candidate = `${base}-${departureDate}-${i}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

/** Unpublishes a tour. Same reasoning as retiring a room type. */
export async function unpublishTour(tourId: string): Promise<ActionState> {
  const growthClientId = await me();
  if (!growthClientId) return { error: { _form: ["Please log in again."] } };

  const admin = createAdminClient();
  await admin
    .from("tours")
    .update({ is_published: false, updated_at: new Date().toISOString() })
    .eq("id", tourId)
    .eq("growth_client_id", growthClientId);

  refresh();
  return { saved: true };
}

/** Blocks nights on a room type, for anything sold elsewhere or maintenance. */
export async function addBlock(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const growthClientId = await me();
  if (!growthClientId) return { error: { _form: ["Please log in again."] } };

  const parsed = blockSchema.safeParse({
    roomTypeId: formData.get("roomTypeId"),
    firstNight: formData.get("firstNight"),
    lastNight: formData.get("lastNight"),
    units: formData.get("units") ?? 1,
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const admin = createAdminClient();
  const { data: roomType } = await admin
    .from("stays_room_types")
    .select("id")
    .eq("id", parsed.data.roomTypeId)
    .eq("growth_client_id", growthClientId)
    .maybeSingle();

  if (!roomType) return { error: { roomTypeId: ["Choose one of your own rooms"] } };

  const { error } = await admin.from("stays_blocks").insert({
    growth_client_id: growthClientId,
    room_type_id: parsed.data.roomTypeId,
    first_night: parsed.data.firstNight,
    last_night: parsed.data.lastNight,
    units: parsed.data.units,
    reason: parsed.data.reason || null,
  });

  if (error) {
    console.error("Could not block dates", error);
    return { error: GENERIC_ERROR };
  }

  refresh();
  return { saved: true };
}

export async function removeBlock(blockId: string): Promise<ActionState> {
  const growthClientId = await me();
  if (!growthClientId) return { error: { _form: ["Please log in again."] } };

  const admin = createAdminClient();
  await admin.from("stays_blocks").delete().eq("id", blockId).eq("growth_client_id", growthClientId);

  refresh();
  return { saved: true };
}

/**
 * Cancels a booking, releases the dates and records what happened.
 *
 * The system never moves money. Handoff Job 8 says it three ways and this
 * is where it matters most: a member who refunded a guest ticks that they
 * did it in their own Paystack, and all this records is that they said so.
 * Nothing here can move a cent in either direction.
 */
export async function cancelBooking(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const growthClientId = await me();
  if (!growthClientId) return { error: { _form: ["Please log in again."] } };

  const parsed = cancelBookingSchema.safeParse({
    bookingId: formData.get("bookingId"),
    kind: formData.get("kind"),
    reason: formData.get("reason") ?? "",
    refundGiven: formData.get("refundGiven") === "on" || formData.get("refundGiven") === "true",
    refundNote: formData.get("refundNote") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const admin = createAdminClient();
  const { error } = await admin
    .from(parsed.data.kind === "tour" ? "tours_bookings" : "stays_bookings")
    .update({
      status: "cancelled",
      // Cleared in the same write that cancels, so the dates are back in
      // availability immediately rather than at the next sweep. Acceptance
      // criterion 10.
      hold_expires_at: null,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: parsed.data.reason || null,
      refund_given: parsed.data.refundGiven,
      refund_note: parsed.data.refundNote || null,
    })
    .eq("id", parsed.data.bookingId)
    .eq("growth_client_id", growthClientId);

  if (error) {
    console.error("Could not cancel a booking", error);
    return { error: GENERIC_ERROR };
  }

  refresh();
  return { saved: true };
}
