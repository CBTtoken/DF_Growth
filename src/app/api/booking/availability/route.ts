import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { expireStaleHoldsForUnit } from "@/lib/booking/expire-stale-holds";

// Public endpoint — a visitor browsing a client's page needs to see what's
// already booked before picking a slot. Deliberately selects only
// bookable_unit_id/starts_at/ends_at/status/quantity, never the customer_*
// columns: reservations has no public RLS select policy at all (it carries
// customer PII), so every public read goes through this admin-client route
// with an explicit column list, matching the same reasoning `leads` used in
// the original schema (server-only writes, never a public select policy).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const unitId = searchParams.get("unitId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!unitId || !from || !to) {
    return NextResponse.json({ error: "unitId, from, and to are required" }, { status: 400 });
  }

  await expireStaleHoldsForUnit(unitId);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("reservations")
    .select("bookable_unit_id, starts_at, ends_at, status, quantity")
    .eq("bookable_unit_id", unitId)
    .in("status", ["held", "confirmed"])
    .gte("ends_at", from)
    .lte("starts_at", to);

  if (error) {
    console.error("Failed to load booking availability", error);
    return NextResponse.json({ error: "Could not load availability" }, { status: 500 });
  }

  return NextResponse.json({ reservations: data ?? [] });
}
