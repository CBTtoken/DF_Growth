import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { StaysDashboard } from "@/components/stays/dashboard/StaysDashboard";
import { listAllTours, listRoomTypes, loadProperty, PHOTO_BASE } from "@/lib/stays/queries";
import { memberHasGateway } from "@/lib/shop/gateway";
import { addDays, todayInSA } from "@/lib/stays/money";

// One place, built for somebody checking a phone in a garden.
//
// Its own route rather than a seventh tab on /dashboard, for the same
// reason /dashboard/messages and /dashboard/board are their own routes:
// this is a thing a member comes back to do every morning, and a tab
// seven across is not a habit anybody forms. The Selling tab links here.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stays and Tours",
  robots: { index: false, follow: false },
};

export default async function StaysDashboardPage() {
  const client = await requireGrowthClientId();
  if (client.error || !client.id) redirect("/login");

  const growthClientId = client.id;
  const admin = createAdminClient();
  const today = todayInSA();

  const [property, roomTypes, tours, hasGateway, { data: growthClient }] = await Promise.all([
    loadProperty(growthClientId),
    listRoomTypes(growthClientId),
    listAllTours(growthClientId),
    memberHasGateway(growthClientId),
    admin.from("growth_clients").select("slug, business_name").eq("id", growthClientId).single(),
  ]);

  // Bookings, blocks, the waiting list and the member's photo library, in
  // one round of parallel queries. Every one of them is bounded: a member
  // who has been trading for three years should not wait for three years of
  // history to load before they can see who is arriving tomorrow.
  const [{ data: stayBookings }, { data: tourBookings }, { data: blocks }, { data: waitlist }, { data: photos }] =
    await Promise.all([
      admin
        .from("stays_bookings")
        .select(
          "id, room_type_id, check_in, check_out, units, adults, children, guest_name, guest_email, guest_phone, nights, nightly_rate_cents, total_cents, deposit_cents, status, payment_status, guest_token, cancelled_at, cancellation_reason, refund_given, created_at, bizup_document_id, stays_room_types(name)"
        )
        .eq("growth_client_id", growthClientId)
        .neq("status", "held")
        .neq("status", "expired")
        .order("check_in", { ascending: true })
        .limit(400),
      admin
        .from("tours_bookings")
        .select(
          "id, tour_id, seats, guest_name, guest_email, guest_phone, price_cents, total_cents, deposit_cents, status, payment_status, guest_token, cancelled_at, cancellation_reason, refund_given, created_at, bizup_document_id, tours(title, departure_date, departure_time)"
        )
        .eq("growth_client_id", growthClientId)
        .neq("status", "held")
        .neq("status", "expired")
        .order("created_at", { ascending: false })
        .limit(400),
      admin
        .from("stays_blocks")
        .select("id, room_type_id, first_night, last_night, units, reason")
        .eq("growth_client_id", growthClientId)
        .gte("last_night", addDays(today, -30))
        .order("first_night", { ascending: true })
        .limit(200),
      admin
        .from("tours_waitlist")
        .select("id, tour_id, name, email, phone, people, note, created_at, tours(title)")
        .eq("growth_client_id", growthClientId)
        .order("created_at", { ascending: false })
        .limit(200),
      admin
        .from("client_photos")
        .select("id, storage_path, position")
        .eq("growth_client_id", growthClientId)
        .order("position", { ascending: true })
        .limit(60),
    ]);

  return (
    <main className="min-h-full bg-gray-50 px-4 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div>
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-gray-500 underline-offset-4 hover:text-brand hover:underline"
          >
            ← Back to your dashboard
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink">Stays and Tours</h1>
          <p className="mt-1 text-sm text-gray-500">{growthClient?.business_name}</p>
        </div>

        <StaysDashboard
          clientSlug={growthClient?.slug ?? ""}
          property={property}
          roomTypes={roomTypes}
          tours={tours}
          stayBookings={(stayBookings ?? []).map((row) => ({
            ...row,
            roomName: (row.stays_room_types as unknown as { name: string } | null)?.name ?? "Room",
          }))}
          tourBookings={(tourBookings ?? []).map((row) => {
            const tour = row.tours as unknown as {
              title: string;
              departure_date: string;
              departure_time: string | null;
            } | null;
            return {
              ...row,
              tourTitle: tour?.title ?? "Tour",
              departureDate: tour?.departure_date ?? "",
              departureTime: tour?.departure_time ?? null,
            };
          })}
          blocks={blocks ?? []}
          waitlist={(waitlist ?? []).map((row) => ({
            ...row,
            tourTitle: (row.tours as unknown as { title: string } | null)?.title ?? "Tour",
          }))}
          photos={(photos ?? []).map((photo) => ({ id: photo.id, url: `${PHOTO_BASE}/${photo.storage_path}` }))}
          hasGateway={hasGateway}
          today={today}
        />
      </div>
    </main>
  );
}
