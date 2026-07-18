import { createAdminClient } from "@/lib/supabase/admin";

// docs/GROWTH_BOOKING_SHOP_MODULES_CLAUDE.md Sec 3.6: "unpaid holds release
// automatically after 10 minutes." Postgres exclusion-constraint predicates
// must be immutable, so hold_expires_at > now() can't live inside
// reservations_no_overlap itself — expiry has to be an active step in every
// write path, not just a read filter, or a genuinely-expired 'held' row
// would still block a new booking via the constraint. Called at the top of
// both the public availability read (src/app/api/booking/availability/
// route.ts) and hold creation (src/app/[clientSlug]/booking-actions.ts), so
// correctness never depends on the periodic cron sweep's timing — that sweep
// (src/app/api/cron/expire-booking-holds/route.ts) is pure hygiene on top,
// for units nobody happened to query in the meantime.
export async function expireStaleHoldsForUnit(bookableUnitId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("reservations")
    .update({ status: "expired", hold_expires_at: null })
    .eq("bookable_unit_id", bookableUnitId)
    .eq("status", "held")
    .lt("hold_expires_at", new Date().toISOString());
}
