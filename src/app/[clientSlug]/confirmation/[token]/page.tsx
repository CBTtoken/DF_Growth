import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { GuestChat } from "@/components/stays/GuestChat";
import { getStaysOwnerWithGateway } from "@/lib/stays/queries";
import { settleStayBooking, settleTourBooking } from "@/lib/stays/confirm";
import { STAY_COPY } from "@/lib/stays/copy";
import { longDate, rand } from "@/lib/stays/money";

// One guest's own booking, stay or tour.
//
// Never cached and never indexed. It carries a person's name, email and
// phone number, and a cached copy of somebody's confirmation is the kind of
// thing that gets served to the wrong person. The standing rule is that
// personal information never appears in a page an unauthenticated request
// can fetch; what makes this page compatible with that rule is the token,
// which is 48 hex characters of randomness generated at booking and is the
// only way to reach it. There is no listing, no search and no way in
// without the link that was emailed.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your booking",
  robots: { index: false, follow: false },
};

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ clientSlug: string; token: string }>;
}) {
  const { clientSlug, token } = await params;

  // A malformed token is a 404 rather than a database error page. This
  // route is reachable by anybody typing into the address bar.
  if (!/^[st][0-9a-f]{48}$/.test(token)) return notFound();

  const owner = await getStaysOwnerWithGateway(clientSlug);
  if (!owner) return notFound();

  const admin = createAdminClient();
  const accentColor = owner.brandPrimaryColor || "#1081b8";
  const isTour = token.startsWith("t");

  if (isTour) {
    const { data: booking } = await admin
      .from("tours_bookings")
      .select(
        "id, growth_client_id, tour_id, seats, price_cents, total_cents, deposit_cents, guest_name, guest_email, guest_phone, status, payment_status, payment_reference, gateway, guest_token, cancelled_at, tours(title, slug, departure_date, departure_time, meeting_point)"
      )
      .eq("guest_token", token)
      .eq("growth_client_id", owner.id)
      .maybeSingle();

    if (!booking) return notFound();

    const tour = booking.tours as unknown as {
      title: string;
      slug: string;
      departure_date: string;
      departure_time: string | null;
      meeting_point: string | null;
    };

    const settled = await settleTourBooking(owner, booking, {
      title: tour.title,
      departureDate: tour.departure_date,
      departureTime: tour.departure_time,
    });

    const paid = settled.paid || booking.payment_status !== "unpaid";
    const cancelled = booking.status === "cancelled";
    const confirmed = booking.status === "confirmed" || settled.paid;

    return (
      <Confirmation
        clientSlug={clientSlug}
        token={token}
        businessName={owner.businessName}
        accentColor={accentColor}
        cancelled={cancelled}
        confirmed={confirmed}
        paid={paid}
        guestName={booking.guest_name}
        ownerPhone={owner.callPhone ?? owner.whatsappPhone}
        what={`${tour.title}, ${booking.seats} ${booking.seats === 1 ? "seat" : "seats"}`}
        when={`${longDate(tour.departure_date)}${tour.departure_time ? `, ${tour.departure_time}` : ""}`}
        extra={tour.meeting_point ? `Meeting point: ${tour.meeting_point}` : null}
        totalCents={booking.total_cents}
        depositCents={booking.deposit_cents}
        balanceDueDays={owner.property.balanceDueDays}
        cancellationTerms={owner.property.cancellationTerms}
      />
    );
  }

  const { data: booking } = await admin
    .from("stays_bookings")
    .select(
      "id, growth_client_id, room_type_id, check_in, check_out, units, nights, nightly_rate_cents, total_cents, deposit_cents, guest_name, guest_email, guest_phone, status, payment_status, payment_reference, gateway, guest_token, cancelled_at, stays_room_types(name)"
    )
    .eq("guest_token", token)
    .eq("growth_client_id", owner.id)
    .maybeSingle();

  if (!booking) return notFound();

  const roomName = (booking.stays_room_types as unknown as { name: string } | null)?.name ?? "Your room";
  const settled = await settleStayBooking(owner, booking, roomName);

  const paid = settled.paid || booking.payment_status !== "unpaid";
  const cancelled = booking.status === "cancelled";
  const confirmed = booking.status === "confirmed" || settled.paid;

  return (
    <Confirmation
      clientSlug={clientSlug}
      token={token}
      businessName={owner.businessName}
      accentColor={accentColor}
      cancelled={cancelled}
      confirmed={confirmed}
      paid={paid}
      guestName={booking.guest_name}
      ownerPhone={owner.callPhone ?? owner.whatsappPhone}
      what={roomName}
      when={`${longDate(booking.check_in)} to ${longDate(booking.check_out)}, ${booking.nights} ${
        booking.nights === 1 ? "night" : "nights"
      }`}
      extra={
        owner.property.checkInFrom || owner.property.checkOutBy
          ? [
              owner.property.checkInFrom ? `Check in from ${owner.property.checkInFrom}` : null,
              owner.property.checkOutBy ? `check out by ${owner.property.checkOutBy}` : null,
            ]
              .filter(Boolean)
              .join(", ")
          : null
      }
      totalCents={booking.total_cents}
      depositCents={booking.deposit_cents}
      balanceDueDays={owner.property.balanceDueDays}
      cancellationTerms={owner.property.cancellationTerms}
    />
  );
}

function Confirmation(props: {
  clientSlug: string;
  token: string;
  businessName: string;
  accentColor: string;
  cancelled: boolean;
  confirmed: boolean;
  paid: boolean;
  guestName: string;
  ownerPhone: string | null;
  what: string;
  when: string;
  extra: string | null;
  totalCents: number;
  depositCents: number;
  balanceDueDays: number;
  cancellationTerms: string | null;
}) {
  const balance = props.totalCents - (props.paid ? props.depositCents : 0);

  const heading = props.cancelled
    ? STAY_COPY.cancelledTitle
    : props.paid
      ? STAY_COPY.confirmedTitle
      : STAY_COPY.requestedTitle;

  const body = props.cancelled
    ? STAY_COPY.cancelledBody(props.businessName)
    : props.paid
      ? STAY_COPY.confirmedBody(props.businessName)
      : STAY_COPY.requestedBody(props.businessName, props.ownerPhone);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{heading}</h1>
          <p className="mt-2 leading-relaxed text-gray-600">
            {props.guestName.split(" ")[0]}, {body}
          </p>

          <dl className="mt-6 flex flex-col gap-2 border-t border-gray-100 pt-5 text-sm">
            <Row label="What" value={props.what} />
            <Row label="When" value={props.when} />
            {props.extra && <Row label="Good to know" value={props.extra} />}
            <Row label="Total" value={rand(props.totalCents)} />
            {props.paid && props.depositCents > 0 && (
              <Row label="Deposit paid" value={rand(props.depositCents)} />
            )}
            {balance > 0 && !props.cancelled && (
              <Row
                label="Still to pay"
                value={`${rand(balance)}${props.paid ? `, ${STAY_COPY.balanceLater(props.balanceDueDays).toLowerCase()}` : ""}`}
              />
            )}
          </dl>

          {props.cancellationTerms && !props.cancelled && (
            <div className="mt-5 rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {STAY_COPY.termsHeading}
              </p>
              <p className="mt-1.5 whitespace-pre-line text-sm text-gray-600">{props.cancellationTerms}</p>
            </div>
          )}
        </div>

        {/* Offered after booking, on the confirmation, never before
            payment. A held booking nobody has paid for does not get one
            either: the Server Action checks the booking is confirmed. */}
        {props.confirmed && !props.cancelled && (
          <GuestChat
            clientSlug={props.clientSlug}
            token={props.token}
            businessName={props.businessName}
            accentColor={props.accentColor}
          />
        )}

        <p className="text-center text-sm text-gray-500">
          <Link href={`/${props.clientSlug}`} className="font-semibold underline-offset-4 hover:underline">
            Back to {props.businessName}
          </Link>
        </p>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-semibold text-gray-900">{value}</dd>
    </div>
  );
}
