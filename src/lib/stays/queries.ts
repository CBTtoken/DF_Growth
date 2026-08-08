import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { memberGatewayProvider, type GatewayProvider } from "@/lib/shop/gateway";
import { depositCents, nightsBetween } from "@/lib/stays/money";
import type { AvailableRoom, RoomType, StaysProperty, Tour, TourWithSeats } from "@/lib/stays/types";

// Everything the public page, the tour page and the dashboard read.
//
// Kept in one file for the same reason src/lib/shop/queries.ts is: three
// callers want almost the same shape, and three of them drifting apart is
// how a room ends up priced one way in search and another on a
// confirmation.

export const PHOTO_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-photos`;

export type StaysOwner = {
  id: string;
  slug: string;
  businessName: string;
  contactEmail: string | null;
  callPhone: string | null;
  whatsappPhone: string | null;
  brandPrimaryColor: string | null;
  logoPath: string | null;
  city: string | null;
  property: StaysProperty;
  /** Whether this member can take a deposit online. Never the key itself. */
  hasGateway: boolean;
  gatewayProvider: GatewayProvider | null;
};

const ROOM_COLUMNS =
  "id, name, description, max_adults, max_children, units_count, rate_cents, deposit_kind, deposit_percent, deposit_fixed_cents, amenities, photo_ids, position, is_active";

const TOUR_COLUMNS =
  "id, slug, title, summary, description, itinerary, meeting_point, departure_date, departure_time, duration_text, price_cents, seats_total, deposit_kind, deposit_percent, deposit_fixed_cents, photo_ids, is_published, position";

type RoomRow = {
  id: string;
  name: string;
  description: string | null;
  max_adults: number;
  max_children: number;
  units_count: number;
  rate_cents: number | null;
  deposit_kind: string;
  deposit_percent: number;
  deposit_fixed_cents: number;
  amenities: string[] | null;
  photo_ids: string[] | null;
  position: number;
  is_active: boolean;
};

export function shapeRoomType(row: unknown): RoomType {
  const raw = row as RoomRow;
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    maxAdults: raw.max_adults,
    maxChildren: raw.max_children,
    unitsCount: raw.units_count,
    rateCents: raw.rate_cents,
    depositKind: raw.deposit_kind === "fixed" ? "fixed" : "percent",
    depositPercent: raw.deposit_percent,
    depositFixedCents: raw.deposit_fixed_cents,
    amenities: raw.amenities ?? [],
    photoIds: raw.photo_ids ?? [],
    position: raw.position,
    isActive: raw.is_active,
  };
}

type TourRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  itinerary: string | null;
  meeting_point: string | null;
  departure_date: string;
  departure_time: string | null;
  duration_text: string | null;
  price_cents: number;
  seats_total: number;
  deposit_kind: string;
  deposit_percent: number;
  deposit_fixed_cents: number;
  photo_ids: string[] | null;
  is_published: boolean;
  position: number;
};

export function shapeTour(row: unknown): Tour {
  const raw = row as TourRow;
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    summary: raw.summary,
    description: raw.description,
    itinerary: raw.itinerary,
    meetingPoint: raw.meeting_point,
    departureDate: raw.departure_date,
    departureTime: raw.departure_time,
    durationText: raw.duration_text,
    priceCents: raw.price_cents,
    seatsTotal: raw.seats_total,
    depositKind: raw.deposit_kind === "fixed" ? "fixed" : "percent",
    depositPercent: raw.deposit_percent,
    depositFixedCents: raw.deposit_fixed_cents,
    photoIds: raw.photo_ids ?? [],
    isPublished: raw.is_published,
    position: raw.position,
  };
}

const DEFAULT_PROPERTY = (growthClientId: string): StaysProperty => ({
  growthClientId,
  enabled: false,
  intro: null,
  amenities: [],
  checkInFrom: null,
  checkOutBy: null,
  balanceDueDays: 7,
  cancellationTerms: null,
});

/**
 * The member behind a Stays and Tours page, or null.
 *
 * Null covers every reason the section should not be served: no such slug,
 * the client is not active, or Stays and Tours is switched off. The caller
 * turns all of those into the same nothing, because a visitor is owed one
 * answer and not a taxonomy of why.
 */
export const getStaysOwner = cache(async function getStaysOwner(
  clientSlug: string
): Promise<StaysOwner | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("growth_clients")
    .select(
      "id, slug, business_name, contact_email, call_phone, whatsapp_phone, brand_primary_color, logo_path, city, stays_properties(enabled, intro, amenities, check_in_from, check_out_by, balance_due_days, cancellation_terms)"
    )
    .eq("slug", clientSlug)
    .eq("status", "active")
    .maybeSingle();

  if (!data) return null;

  // stays_properties.growth_client_id is its own primary key, a real
  // one-to-one, so Postgrest embeds it as a single object rather than an
  // array, the same way booking_operational_rules does.
  const row = data.stays_properties as unknown as {
    enabled: boolean;
    intro: string | null;
    amenities: string[] | null;
    check_in_from: string | null;
    check_out_by: string | null;
    balance_due_days: number;
    cancellation_terms: string | null;
  } | null;

  if (!row?.enabled) return null;

  return {
    id: data.id,
    slug: data.slug,
    businessName: data.business_name,
    contactEmail: data.contact_email,
    callPhone: data.call_phone,
    whatsappPhone: data.whatsapp_phone,
    brandPrimaryColor: data.brand_primary_color,
    logoPath: data.logo_path,
    city: data.city,
    property: {
      growthClientId: data.id,
      enabled: row.enabled,
      intro: row.intro,
      amenities: row.amenities ?? [],
      checkInFrom: row.check_in_from,
      checkOutBy: row.check_out_by,
      balanceDueDays: row.balance_due_days,
      cancellationTerms: row.cancellation_terms,
    },
    hasGateway: false,
    gatewayProvider: null,
  };
});

/**
 * The same owner, with whether they can take a deposit online resolved.
 *
 * Split from getStaysOwner because answering it decrypts a stored key, and
 * the page that only renders a date picker has no business doing that on
 * every visit. Only the checkout path asks.
 */
export async function getStaysOwnerWithGateway(clientSlug: string): Promise<StaysOwner | null> {
  const owner = await getStaysOwner(clientSlug);
  if (!owner) return null;
  const provider = await memberGatewayProvider(owner.id);
  return { ...owner, hasGateway: provider !== null, gatewayProvider: provider };
}

/** The member's property settings, whether or not Stays is switched on. */
export async function loadProperty(growthClientId: string): Promise<StaysProperty> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("stays_properties")
    .select("enabled, intro, amenities, check_in_from, check_out_by, balance_due_days, cancellation_terms")
    .eq("growth_client_id", growthClientId)
    .maybeSingle();

  if (!data) return DEFAULT_PROPERTY(growthClientId);

  return {
    growthClientId,
    enabled: data.enabled,
    intro: data.intro,
    amenities: data.amenities ?? [],
    checkInFrom: data.check_in_from,
    checkOutBy: data.check_out_by,
    balanceDueDays: data.balance_due_days,
    cancellationTerms: data.cancellation_terms,
  };
}

/** Every room type a member has, including unpriced and switched-off ones. */
export async function listRoomTypes(growthClientId: string): Promise<RoomType[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("stays_room_types")
    .select(ROOM_COLUMNS)
    .eq("growth_client_id", growthClientId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  return (data ?? []).map(shapeRoomType);
}

/**
 * What is actually available, for a real party, across a real range.
 *
 * Two rules decide it, and both are acceptance criteria:
 *
 *   1. Only room types that physically fit the party. A party of two adults
 *      and two children never sees a room type with a maximum of two.
 *   2. Only room types with at least one unit free on EVERY night in the
 *      range. Free on four nights out of five is not free.
 *
 * The arithmetic is deliberately per night rather than per range. A room
 * type with four units, three booked on Tuesday and one booked on
 * Wednesday, has one free on the tightest night, not three: taking the
 * maximum across nights is what stops a stay being sold over a single busy
 * midweek night in the middle of it.
 *
 * Blocked dates are counted in the same sum as bookings, because a room
 * being painted and a room being slept in are the same thing to somebody
 * searching. An expired hold counts for nothing regardless of whether the
 * sweep has run yet.
 */
export async function searchAvailability(options: {
  growthClientId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
}): Promise<AvailableRoom[]> {
  const { growthClientId, checkIn, checkOut, adults, children } = options;
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) return [];

  const admin = createAdminClient();
  const { data: roomRows } = await admin
    .from("stays_room_types")
    .select(ROOM_COLUMNS)
    .eq("growth_client_id", growthClientId)
    .eq("is_active", true)
    .not("rate_cents", "is", null)
    .gte("max_adults", adults)
    .gte("max_children", children)
    .order("position", { ascending: true });

  const rooms = (roomRows ?? []).map(shapeRoomType);
  if (rooms.length === 0) return [];

  const roomIds = rooms.map((r) => r.id);
  const nowIso = new Date().toISOString();

  // Two bounded queries rather than one per room type. Both are indexed on
  // (room_type_id, dates) and both are filtered to the range being searched,
  // so neither grows with the member's history, only with what overlaps
  // these particular nights.
  const [{ data: bookingRows }, { data: blockRows }] = await Promise.all([
    admin
      .from("stays_bookings")
      .select("room_type_id, check_in, check_out, units, status, hold_expires_at")
      .in("room_type_id", roomIds)
      .in("status", ["confirmed", "held"])
      .lt("check_in", checkOut)
      .gt("check_out", checkIn),
    admin
      .from("stays_blocks")
      .select("room_type_id, first_night, last_night, units")
      .in("room_type_id", roomIds)
      .lte("first_night", checkOut)
      .gte("last_night", checkIn),
  ]);

  // night -> room type -> units taken
  const taken = new Map<string, Map<string, number>>();
  const add = (roomId: string, night: string, units: number) => {
    let byRoom = taken.get(night);
    if (!byRoom) {
      byRoom = new Map();
      taken.set(night, byRoom);
    }
    byRoom.set(roomId, (byRoom.get(roomId) ?? 0) + units);
  };

  for (const row of bookingRows ?? []) {
    // A hold that has run out occupies nothing, sweep or no sweep.
    if (row.status === "held" && (!row.hold_expires_at || row.hold_expires_at <= nowIso)) continue;
    for (const night of nightsIn(row.check_in, row.check_out)) {
      if (night >= checkIn && night < checkOut) add(row.room_type_id, night, row.units);
    }
  }

  for (const row of blockRows ?? []) {
    // Blocks are stored inclusive of both nights, bookings are half open.
    // This is the one place the two meet, so the conversion lives here.
    for (const night of nightsIn(row.first_night, addOneDay(row.last_night))) {
      if (night >= checkIn && night < checkOut) add(row.room_type_id, night, row.units);
    }
  }

  const searchNights = [...nightsIn(checkIn, checkOut)];

  return rooms
    .map((roomType) => {
      const worstNight = searchNights.reduce(
        (worst, night) => Math.max(worst, taken.get(night)?.get(roomType.id) ?? 0),
        0
      );
      const unitsFree = roomType.unitsCount - worstNight;
      const nightlyRateCents = roomType.rateCents ?? 0;
      const totalCents = nightlyRateCents * nights;
      return {
        roomType,
        nights,
        nightlyRateCents,
        totalCents,
        depositCents: depositCents(
          totalCents,
          roomType.depositKind,
          roomType.depositPercent,
          roomType.depositFixedCents
        ),
        unitsFree,
      };
    })
    .filter((room) => room.unitsFree > 0);
}

/** Every night in a half-open range, as ISO dates. */
function* nightsIn(from: string, to: string): Generator<string> {
  let cursor = from;
  // Guard rather than trust: a corrupted range must not spin forever on a
  // public page. Two years of nights is far past anything real.
  for (let i = 0; i < 730 && cursor < to; i += 1) {
    yield cursor;
    cursor = addOneDay(cursor);
  }
}

function addOneDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

// ============================================================
// Tours
// ============================================================

/** Published, still to come, soonest first. What a guest may see. */
export async function listPublishedTours(growthClientId: string, today: string): Promise<TourWithSeats[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tours")
    .select(TOUR_COLUMNS)
    .eq("growth_client_id", growthClientId)
    .eq("is_published", true)
    .gte("departure_date", today)
    .order("departure_date", { ascending: true })
    .limit(24);

  return withSeats((data ?? []).map(shapeTour));
}

/** Every tour a member has, past ones included. What the dashboard shows. */
export async function listAllTours(growthClientId: string): Promise<TourWithSeats[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tours")
    .select(TOUR_COLUMNS)
    .eq("growth_client_id", growthClientId)
    .order("departure_date", { ascending: false })
    .limit(200);

  return withSeats((data ?? []).map(shapeTour));
}

export async function getTourBySlug(
  growthClientId: string,
  slug: string
): Promise<TourWithSeats | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tours")
    .select(TOUR_COLUMNS)
    .eq("growth_client_id", growthClientId)
    .eq("slug", slug)
    .maybeSingle();

  if (!data) return null;
  const [tour] = await withSeats([shapeTour(data)]);
  return tour ?? null;
}

/**
 * Seats sold, counted once for however many tours were asked for.
 *
 * One query for the whole list rather than one per tour: the row of cards
 * on a member's page would otherwise be a query per card, which is the
 * classic N+1 and the exact thing that makes a page feel slow the week a
 * member adds their tenth tour.
 */
async function withSeats(tours: Tour[]): Promise<TourWithSeats[]> {
  if (tours.length === 0) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("tours_bookings")
    .select("tour_id, seats, status, hold_expires_at")
    .in(
      "tour_id",
      tours.map((t) => t.id)
    )
    .in("status", ["confirmed", "held"]);

  const nowIso = new Date().toISOString();
  const takenByTour = new Map<string, number>();
  for (const row of data ?? []) {
    if (row.status === "held" && (!row.hold_expires_at || row.hold_expires_at <= nowIso)) continue;
    takenByTour.set(row.tour_id, (takenByTour.get(row.tour_id) ?? 0) + row.seats);
  }

  return tours.map((tour) => {
    const seatsTaken = takenByTour.get(tour.id) ?? 0;
    return { ...tour, seatsTaken, seatsLeft: Math.max(0, tour.seatsTotal - seatsTaken) };
  });
}

/** The member's own photos, by id, for room and tour galleries. */
export async function photoUrlsByIds(
  growthClientId: string,
  ids: string[]
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const admin = createAdminClient();
  const { data } = await admin
    .from("client_photos")
    .select("id, storage_path")
    .eq("growth_client_id", growthClientId)
    .in("id", ids);

  return new Map((data ?? []).map((row) => [row.id, `${PHOTO_BASE}/${row.storage_path}`]));
}
