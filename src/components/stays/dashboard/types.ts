// The shapes the dashboard panels share.
//
// Deliberately the database's own column names rather than camelCase, for
// the booking rows only: they come straight out of one query in
// /dashboard/stays/page.tsx and get read in four panels, and renaming
// fourteen fields in transit would be work that buys nothing.

export type StayBookingRow = {
  id: string;
  room_type_id: string;
  roomName: string;
  check_in: string;
  check_out: string;
  units: number;
  adults: number;
  children: number;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  nights: number;
  nightly_rate_cents: number;
  total_cents: number;
  deposit_cents: number;
  status: string;
  payment_status: string;
  guest_token: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  refund_given: boolean;
  created_at: string;
  bizup_document_id: string | null;
};

export type TourBookingRow = {
  id: string;
  tour_id: string;
  tourTitle: string;
  departureDate: string;
  departureTime: string | null;
  seats: number;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  price_cents: number;
  total_cents: number;
  deposit_cents: number;
  status: string;
  payment_status: string;
  guest_token: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  refund_given: boolean;
  created_at: string;
  bizup_document_id: string | null;
};

export type BlockRow = {
  id: string;
  room_type_id: string;
  first_night: string;
  last_night: string;
  units: number;
  reason: string | null;
};

export type WaitlistRow = {
  id: string;
  tour_id: string;
  tourTitle: string;
  name: string;
  email: string | null;
  phone: string | null;
  people: number;
  note: string | null;
  created_at: string;
};

export type PhotoOption = { id: string; url: string };

/** What is still owed on a booking, in cents. Zero when it is settled. */
export function balanceOwing(booking: { total_cents: number; deposit_cents: number; payment_status: string }): number {
  if (booking.payment_status === "paid") return 0;
  if (booking.payment_status === "deposit_paid") return Math.max(0, booking.total_cents - booking.deposit_cents);
  return booking.total_cents;
}
