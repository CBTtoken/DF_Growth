import { createAdminClient } from "@/lib/supabase/admin";

// The hold, and how it lets go.
//
// Handoff Job 3, stated as an acceptance criterion in its own right:
// "Release must be a scheduled job, not something that runs when a page is
// next loaded. A room held by an abandoned checkout at 11pm must be free
// again at 11:05pm, not at 8am when somebody visits the site."
//
// That is a real difference and not a detail. The existing appointment
// Booking module releases its holds inside the read path
// (src/lib/booking/expire-stale-holds.ts), which works for a business whose
// slots are looked at all day and fails completely for a guesthouse whose
// page nobody opens between eleven at night and eight in the morning. The
// room would sit held all night against a payment that never happened.
//
// So there are two mechanisms here and they do different jobs:
//
//   1. Availability ignores an expired hold on sight, in SQL and in
//      TypeScript, so correctness never waits for a schedule.
//   2. This sweep, run every minute by Vercel Cron, actually flips the row
//      to 'expired' so the dashboard, the member and anybody reading the
//      table see the truth without having to know rule 1.

export const HOLD_MINUTES = 5;

export type SweepResult = { stays: number; tours: number };

/**
 * Releases every hold whose five minutes are up, across every member.
 *
 * Idempotent by construction: it only ever touches rows that are still
 * 'held' and already past their expiry, so running it twice in the same
 * minute does the same nothing the second time.
 */
export async function expireStaleHolds(): Promise<SweepResult> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const [stays, tours] = await Promise.all([
    admin
      .from("stays_bookings")
      .update({ status: "expired", hold_expires_at: null })
      .eq("status", "held")
      .lt("hold_expires_at", now)
      .select("id"),
    admin
      .from("tours_bookings")
      .update({ status: "expired", hold_expires_at: null })
      .eq("status", "held")
      .lt("hold_expires_at", now)
      .select("id"),
  ]);

  if (stays.error) console.error("Could not expire stay holds", stays.error);
  if (tours.error) console.error("Could not expire tour holds", tours.error);

  return { stays: stays.data?.length ?? 0, tours: tours.data?.length ?? 0 };
}
