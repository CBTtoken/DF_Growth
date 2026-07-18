"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookingHoldSchema } from "@/lib/schemas/booking";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";
import { expireStaleHoldsForUnit } from "@/lib/booking/expire-stale-holds";
import { sendEmail } from "@/lib/email/resend";

type BookingState =
  | { error?: Record<string, string[]> & { _form?: string[] }; success?: boolean; confirmed?: boolean }
  | null;

// docs/GROWTH_BOOKING_SHOP_MODULES_CLAUDE.md Sec 3.2/3.6. Real payment
// (Paystack Subaccount routing) is Sprint 4's job, per the spec's own
// sprint order — this sprint's interim behavior skips the 10-minute
// payment-hold step entirely and books directly as 'confirmed' (unpaid),
// notifying the business owner to arrange payment themselves in the
// meantime. Double-booking protection does NOT wait for Sprint 4: the
// reservations_no_overlap exclusion constraint already covers 'confirmed'
// rows, so this is real protection today, not a placeholder. Once Sprint 4
// lands, this switches to creating a 'held' row + Paystack checkout, with
// the webhook converting it to 'confirmed' on payment success.
export async function createBookingHold(
  growthClientId: string,
  ownerEmail: string | null,
  businessName: string,
  _prevState: BookingState,
  formData: FormData
): Promise<BookingState> {
  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`booking-hold:${ip}`, 5, 10 * 60 * 1000)) {
    return { error: { _form: ["Too many booking attempts — please wait a few minutes and try again."] } };
  }

  const parsed = bookingHoldSchema.safeParse({
    bookableUnitId: formData.get("bookableUnitId"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    quantity: formData.get("quantity") || 1,
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    customerEmail: formData.get("customerEmail"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const admin = createAdminClient();

  const { data: unit } = await admin
    .from("bookable_units")
    .select("id, unit_type, base_price_cents, growth_client_id, is_active")
    .eq("id", parsed.data.bookableUnitId)
    .eq("growth_client_id", growthClientId)
    .single();

  if (!unit || !unit.is_active) {
    return { error: { _form: ["This booking option is no longer available."] } };
  }

  await expireStaleHoldsForUnit(unit.id);

  const { error } = await admin.from("reservations").insert({
    growth_client_id: growthClientId,
    bookable_unit_id: unit.id,
    unit_type: unit.unit_type,
    status: "confirmed",
    starts_at: parsed.data.startsAt,
    ends_at: parsed.data.endsAt,
    quantity: parsed.data.quantity,
    customer_name: parsed.data.customerName,
    customer_phone: parsed.data.customerPhone,
    customer_email: parsed.data.customerEmail,
    price_cents: unit.base_price_cents * parsed.data.quantity,
    payment_status: "unpaid",
  });

  if (error) {
    // 23P01 = Postgres exclusion-constraint violation — the same idiom
    // already used in src/app/api/webhooks/paystack/route.ts for 23505 on
    // founding_signup_number.
    if (error.code === "23P01") {
      return { error: { _form: ["That slot was just taken — please pick another time."] } };
    }
    console.error("Failed to create booking", error);
    return { error: { _form: ["Could not complete your booking, please try again."] } };
  }

  revalidatePath(`/[clientSlug]`, "page");

  if (ownerEmail) {
    try {
      await sendEmail({
        to: ownerEmail,
        subject: `New booking: ${parsed.data.customerName}`,
        html: `
          <p>Good day ${businessName},</p>
          <p>You've got a new booking from your DigitalFlyer SA page. Payment isn't collected automatically yet — please arrange payment directly with the customer.</p>
          <p>
            <strong>Name:</strong> ${parsed.data.customerName}<br>
            <strong>Email:</strong> ${parsed.data.customerEmail}<br>
            <strong>Phone:</strong> ${parsed.data.customerPhone}
          </p>
          <p>View it in your <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard">dashboard</a>.</p>
        `,
      });
    } catch (err) {
      console.error("Booking notification email failed", err);
    }
  }

  return { success: true, confirmed: true };
}
