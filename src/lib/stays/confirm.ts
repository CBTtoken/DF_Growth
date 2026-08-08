import { createAdminClient } from "@/lib/supabase/admin";
import { verifyGatewayPayment, type GatewayProvider } from "@/lib/shop/gateway";
import { raiseBalanceInvoice, stayLineDescription } from "@/lib/stays/katisobiz";
import { confirmToGuest, describeStay, notifyOwnerOfBooking } from "@/lib/stays/notify";
import { longDate } from "@/lib/stays/money";
import { sendEmail } from "@/lib/email/resend";
import type { StaysOwner } from "@/lib/stays/queries";

// Turning a paid hold into a booking.
//
// Never trusts the browser coming back from the gateway. A guest returning
// from a hosted checkout arrives with nothing more than a URL, which is a
// thing anybody can retype, so the question "was this paid" is asked of the
// gateway's own API and of nobody else. Same rule the shop's order page
// already follows, and the same reason.
//
// Runs once. A guest refreshing their confirmation page ten times must not
// raise ten invoices, so everything after the first success is guarded on
// the row's own payment_status.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://growth.digitalflyersa.co.za";

export type SettledBooking = { paid: boolean; clash: boolean };

type StayRow = {
  id: string;
  growth_client_id: string;
  room_type_id: string;
  check_in: string;
  check_out: string;
  units: number;
  nights: number;
  nightly_rate_cents: number;
  total_cents: number;
  deposit_cents: number;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  status: string;
  payment_status: string;
  payment_reference: string | null;
  gateway: string | null;
  guest_token: string;
};

/**
 * Asks the gateway, then writes down what it said.
 *
 * The interesting case is a hold that expired while the guest was still on
 * the payment page. The money is real, so the booking is confirmed either
 * way, but if the room went to somebody else in those minutes the member is
 * told immediately and in plain words rather than finding two guests at one
 * door. That is a clash a person resolves; it is not something software
 * should quietly pick a winner for.
 */
export async function settleStayBooking(
  owner: StaysOwner,
  booking: StayRow,
  roomName: string
): Promise<SettledBooking> {
  if (booking.payment_status !== "unpaid") return { paid: true, clash: false };
  if (booking.status === "cancelled") return { paid: false, clash: false };
  if (!booking.payment_reference) return { paid: false, clash: false };

  const verdict = await verifyGatewayPayment(
    owner.id,
    booking.payment_reference,
    (booking.gateway as GatewayProvider | null) ?? null
  );
  if (!verdict.paid) return { paid: false, clash: false };

  const admin = createAdminClient();
  const clash = booking.status === "expired" ? await roomWasTakenMeanwhile(booking) : false;

  const { data: updated } = await admin
    .from("stays_bookings")
    .update({
      status: "confirmed",
      hold_expires_at: null,
      payment_status: booking.deposit_cents >= booking.total_cents ? "paid" : "deposit_paid",
      deposit_paid_at: new Date().toISOString(),
    })
    .eq("id", booking.id)
    // The guard that makes a refresh harmless. Only the first update to
    // land moves the row off 'unpaid', so only the first one gets a row
    // back and only the first one raises an invoice and sends the emails.
    .eq("payment_status", "unpaid")
    .select("id")
    .maybeSingle();

  if (!updated) return { paid: true, clash: false };

  const invoice = await raiseBalanceInvoice({
    growthClientId: owner.id,
    guest: { name: booking.guest_name, email: booking.guest_email, phone: booking.guest_phone },
    lines: [
      {
        description: stayLineDescription(roomName, booking.check_in, booking.check_out, booking.nights),
        quantity: booking.nights * booking.units,
        unit: "night",
        unitPriceExclCents: booking.nightly_rate_cents,
      },
    ],
    depositCents: booking.deposit_cents,
    balanceDueDays: owner.property.balanceDueDays,
    reference: booking.payment_reference,
  });

  if (invoice) {
    await admin.from("stays_bookings").update({ bizup_document_id: invoice.documentId }).eq("id", booking.id);
  }

  const facts = {
    businessName: owner.businessName,
    ownerEmail: owner.contactEmail,
    guestName: booking.guest_name,
    guestEmail: booking.guest_email,
    guestPhone: booking.guest_phone,
    what: roomName,
    when: describeStay(booking.check_in, booking.check_out, booking.nights),
    totalCents: booking.total_cents,
    depositCents: booking.deposit_cents,
    paid: true,
    balanceDueDays: owner.property.balanceDueDays,
    confirmationUrl: `${SITE_URL}/${owner.slug}/confirmation/${booking.guest_token}`,
    cancellationTerms: owner.property.cancellationTerms,
  };

  await Promise.all([notifyOwnerOfBooking(facts), confirmToGuest(facts)]);

  if (clash) await warnOwnerOfClash(owner, booking, roomName);

  return { paid: true, clash };
}

type TourRow = {
  id: string;
  growth_client_id: string;
  tour_id: string;
  seats: number;
  price_cents: number;
  total_cents: number;
  deposit_cents: number;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  status: string;
  payment_status: string;
  payment_reference: string | null;
  gateway: string | null;
  guest_token: string;
};

/**
 * The same, for a seat on a tour.
 *
 * Separate function rather than one generic one over both tables: the two
 * rows differ in what they hold and what the invoice line says, and a
 * single function full of "if this is a stay" branches would be harder to
 * read than two short ones that each do one thing.
 */
export async function settleTourBooking(
  owner: StaysOwner,
  booking: TourRow,
  tour: { title: string; departureDate: string; departureTime: string | null }
): Promise<SettledBooking> {
  if (booking.payment_status !== "unpaid") return { paid: true, clash: false };
  if (booking.status === "cancelled") return { paid: false, clash: false };
  if (!booking.payment_reference) return { paid: false, clash: false };

  const verdict = await verifyGatewayPayment(
    owner.id,
    booking.payment_reference,
    (booking.gateway as GatewayProvider | null) ?? null
  );
  if (!verdict.paid) return { paid: false, clash: false };

  const admin = createAdminClient();
  const { data: updated } = await admin
    .from("tours_bookings")
    .update({
      status: "confirmed",
      hold_expires_at: null,
      payment_status: booking.deposit_cents >= booking.total_cents ? "paid" : "deposit_paid",
      deposit_paid_at: new Date().toISOString(),
    })
    .eq("id", booking.id)
    .eq("payment_status", "unpaid")
    .select("id")
    .maybeSingle();

  if (!updated) return { paid: true, clash: false };

  const when = `${longDate(tour.departureDate)}${tour.departureTime ? `, ${tour.departureTime}` : ""}`;

  const invoice = await raiseBalanceInvoice({
    growthClientId: owner.id,
    guest: { name: booking.guest_name, email: booking.guest_email, phone: booking.guest_phone },
    lines: [
      {
        description: `${tour.title}, ${when}`,
        quantity: booking.seats,
        unit: "seat",
        unitPriceExclCents: booking.price_cents,
      },
    ],
    depositCents: booking.deposit_cents,
    balanceDueDays: owner.property.balanceDueDays,
    reference: booking.payment_reference,
  });

  if (invoice) {
    await admin.from("tours_bookings").update({ bizup_document_id: invoice.documentId }).eq("id", booking.id);
  }

  const facts = {
    businessName: owner.businessName,
    ownerEmail: owner.contactEmail,
    guestName: booking.guest_name,
    guestEmail: booking.guest_email,
    guestPhone: booking.guest_phone,
    what: `${tour.title}, ${booking.seats} ${booking.seats === 1 ? "seat" : "seats"}`,
    when,
    totalCents: booking.total_cents,
    depositCents: booking.deposit_cents,
    paid: true,
    balanceDueDays: owner.property.balanceDueDays,
    confirmationUrl: `${SITE_URL}/${owner.slug}/confirmation/${booking.guest_token}`,
    cancellationTerms: owner.property.cancellationTerms,
  };

  await Promise.all([notifyOwnerOfBooking(facts), confirmToGuest(facts)]);

  return { paid: true, clash: false };
}

/** Whether the room filled up while this guest was on the payment page. */
async function roomWasTakenMeanwhile(booking: StayRow): Promise<boolean> {
  const admin = createAdminClient();
  const [{ data: taken }, { data: roomType }] = await Promise.all([
    admin.rpc("stays_units_taken", {
      p_room_type_id: booking.room_type_id,
      p_check_in: booking.check_in,
      p_check_out: booking.check_out,
    }),
    admin.from("stays_room_types").select("units_count").eq("id", booking.room_type_id).maybeSingle(),
  ]);

  const unitsCount = roomType?.units_count ?? 0;
  return Number(taken ?? 0) + booking.units > unitsCount;
}

async function warnOwnerOfClash(owner: StaysOwner, booking: StayRow, roomName: string): Promise<void> {
  if (!owner.contactEmail) return;
  try {
    await sendEmail({
      to: owner.contactEmail,
      subject: `Please check: a payment arrived late for ${booking.guest_name}`,
      html: `
        <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1c2b3a; line-height: 1.6;">
          <p style="font-size: 18px; font-weight: 700; margin: 0 0 12px;">A payment came in after the hold ran out</p>
          <p style="margin: 0 0 16px;">
            ${booking.guest_name} paid a deposit for ${roomName}, ${longDate(booking.check_in)} to ${longDate(booking.check_out)},
            but took longer than five minutes to do it and the room was taken in the meantime.
          </p>
          <p style="margin: 0 0 16px;">
            We have kept their booking, because they have paid you. Please look at your calendar and speak to
            whoever needs to move. We will never decide that for you.
          </p>
          <p style="margin: 0 0 24px;">
            <a href="${SITE_URL}/dashboard/stays" style="display: inline-block; background: #1081b8; color: #ffffff; text-decoration: none; font-weight: 700; padding: 12px 22px; border-radius: 999px;">Open your bookings</a>
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Late payment clash warning failed", err);
  }
}
