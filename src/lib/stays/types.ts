// Shapes shared between the public page, the guest's confirmation, the
// member's dashboard and the emails. One definition each, because a room
// type that means one thing in search and another in the dashboard is how a
// rate ends up displayed differently in two places.

export type DepositKind = "percent" | "fixed";

export type StaysProperty = {
  growthClientId: string;
  enabled: boolean;
  intro: string | null;
  amenities: string[];
  checkInFrom: string | null;
  checkOutBy: string | null;
  balanceDueDays: number;
  cancellationTerms: string | null;
};

export type RoomType = {
  id: string;
  name: string;
  description: string | null;
  maxAdults: number;
  maxChildren: number;
  unitsCount: number;
  /** Null means the member has not priced it yet, so it is never offered. */
  rateCents: number | null;
  depositKind: DepositKind;
  depositPercent: number;
  depositFixedCents: number;
  amenities: string[];
  photoIds: string[];
  position: number;
  isActive: boolean;
};

/** A room type that fits the party and is free for the whole range. */
export type AvailableRoom = {
  roomType: RoomType;
  nights: number;
  nightlyRateCents: number;
  totalCents: number;
  depositCents: number;
  /** How many of this room type are still free across the whole range. */
  unitsFree: number;
};

export type StayBookingStatus = "held" | "confirmed" | "expired" | "cancelled";
export type PaymentStatus = "unpaid" | "deposit_paid" | "paid";

export type Tour = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  itinerary: string | null;
  meetingPoint: string | null;
  departureDate: string;
  departureTime: string | null;
  durationText: string | null;
  priceCents: number;
  seatsTotal: number;
  depositKind: DepositKind;
  depositPercent: number;
  depositFixedCents: number;
  photoIds: string[];
  isPublished: boolean;
  position: number;
};

export type TourWithSeats = Tour & { seatsTaken: number; seatsLeft: number };
