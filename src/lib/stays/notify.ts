import { sendEmail } from "@/lib/email/resend";
import { longDate, rand } from "@/lib/stays/money";

// The two emails a booking sends, and nothing else.
//
// Standing rule, and it shapes this whole file: members send their own
// messages. Nothing here ever emails a guest on the member's behalf beyond
// the confirmation of a thing the guest themselves just did, and nothing
// here ever chases money. The balance reminder is the existing KatisoBiz
// one, which the member presses send on themselves.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://growth.digitalflyersa.co.za";

function shell(body: string): string {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1c2b3a; line-height: 1.6;">
      ${body}
    </div>
  `;
}

function row(label: string, value: string): string {
  return `<tr><td style="padding: 4px 16px 4px 0; color: #718096; font-size: 14px;">${label}</td><td style="padding: 4px 0; font-size: 14px; font-weight: 600;">${value}</td></tr>`;
}

export type BookingEmailFacts = {
  businessName: string;
  ownerEmail: string | null;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  /** "Standard Double" or "Winelands day trip". */
  what: string;
  /** "Fri 12 September to Sun 14 September, 2 nights" or "Sat 20 September". */
  when: string;
  totalCents: number;
  depositCents: number;
  paid: boolean;
  balanceDueDays: number;
  confirmationUrl: string;
  cancellationTerms: string | null;
};

/** Tells the member. Sent on every booking, paid or not. */
export async function notifyOwnerOfBooking(facts: BookingEmailFacts): Promise<void> {
  if (!facts.ownerEmail) return;
  const balance = facts.totalCents - (facts.paid ? facts.depositCents : 0);

  try {
    await sendEmail({
      to: facts.ownerEmail,
      subject: facts.paid
        ? `Booked and paid: ${facts.guestName}, ${facts.when}`
        : `New booking: ${facts.guestName}, ${facts.when}`,
      html: shell(`
        <p style="font-size: 18px; font-weight: 700; margin: 0 0 12px;">
          ${facts.paid ? "A deposit has been paid" : "You have a new booking"}
        </p>
        <table style="border-collapse: collapse; margin: 0 0 20px;">
          ${row("Guest", facts.guestName)}
          ${row("What", facts.what)}
          ${row("When", facts.when)}
          ${facts.guestPhone ? row("Phone", facts.guestPhone) : ""}
          ${facts.guestEmail ? row("Email", facts.guestEmail) : ""}
          ${row("Total", rand(facts.totalCents))}
          ${row(facts.paid ? "Deposit paid" : "Deposit due", rand(facts.depositCents))}
          ${row("Balance owing", rand(balance))}
        </table>
        ${
          facts.paid
            ? `<p style="margin: 0 0 20px; font-size: 14px;">The deposit went into your own account. The balance is yours to collect, and the reminder is in KatisoBiz for you to send when you are ready.</p>`
            : `<p style="margin: 0 0 20px; font-size: 14px;">You are not set up to take payment online yet, so please contact the guest to arrange it. Their dates are held for them in the meantime.</p>`
        }
        <p style="margin: 0 0 24px;">
          <a href="${SITE_URL}/dashboard/stays" style="display: inline-block; background: #1081b8; color: #ffffff; text-decoration: none; font-weight: 700; padding: 12px 22px; border-radius: 999px;">Open your bookings</a>
        </p>
      `),
    });
  } catch (err) {
    // The booking is already saved. A failed notification is worth knowing
    // about and is not worth losing a booking over.
    console.error("Booking notification to owner failed", err);
  }
}

/** Tells the guest, under the member's own name. */
export async function confirmToGuest(facts: BookingEmailFacts): Promise<void> {
  if (!facts.guestEmail) return;
  const balance = facts.totalCents - (facts.paid ? facts.depositCents : 0);

  try {
    await sendEmail({
      to: facts.guestEmail,
      fromName: facts.businessName,
      replyTo: facts.ownerEmail ?? undefined,
      subject: facts.paid
        ? `Your booking with ${facts.businessName} is confirmed`
        : `${facts.businessName} has your booking`,
      html: shell(`
        <p style="font-size: 18px; font-weight: 700; margin: 0 0 12px;">Good day ${facts.guestName.split(" ")[0]},</p>
        <p style="margin: 0 0 16px;">
          ${
            facts.paid
              ? `Thank you. ${facts.businessName} has your deposit and your booking is confirmed.`
              : `Thank you for your booking with ${facts.businessName}. They will be in touch to arrange payment.`
          }
        </p>
        <table style="border-collapse: collapse; margin: 0 0 20px;">
          ${row("What", facts.what)}
          ${row("When", facts.when)}
          ${row("Total", rand(facts.totalCents))}
          ${facts.paid ? row("Deposit paid", rand(facts.depositCents)) : ""}
          ${balance > 0 ? row("Still to pay", rand(balance)) : ""}
        </table>
        ${
          balance > 0 && facts.paid
            ? `<p style="margin: 0 0 16px; font-size: 14px;">The balance of ${rand(balance)} is due ${
                facts.balanceDueDays === 0
                  ? "on arrival"
                  : `${facts.balanceDueDays} ${facts.balanceDueDays === 1 ? "day" : "days"} before you arrive`
              }.</p>`
            : ""
        }
        ${
          facts.cancellationTerms
            ? `<p style="margin: 0 0 16px; font-size: 13px; color: #4a5568;"><strong>Cancellation</strong><br>${escapeHtml(facts.cancellationTerms).replace(/\n/g, "<br>")}</p>`
            : ""
        }
        <p style="margin: 0 0 24px;">
          <a href="${facts.confirmationUrl}" style="display: inline-block; background: #1081b8; color: #ffffff; text-decoration: none; font-weight: 700; padding: 12px 22px; border-radius: 999px;">See your booking</a>
        </p>
        <p style="font-size: 12px; color: #718096; margin: 0;">Keep this link. It is where you can message ${facts.businessName} about your stay.</p>
      `),
    });
  } catch (err) {
    console.error("Booking confirmation to guest failed", err);
  }
}

/** Tells the member somebody joined a waiting list. */
export async function notifyOwnerOfWaitlist(options: {
  ownerEmail: string | null;
  tourTitle: string;
  name: string;
  contact: string;
  people: number;
}): Promise<void> {
  if (!options.ownerEmail) return;
  try {
    await sendEmail({
      to: options.ownerEmail,
      subject: `Waiting list: ${options.name} for ${options.tourTitle}`,
      html: shell(`
        <p style="font-size: 18px; font-weight: 700; margin: 0 0 12px;">Somebody wants the next date</p>
        <table style="border-collapse: collapse; margin: 0 0 20px;">
          ${row("Trip", options.tourTitle)}
          ${row("Name", options.name)}
          ${row("Contact", options.contact)}
          ${row("People", String(options.people))}
        </table>
        <p style="margin: 0 0 24px;">
          <a href="${SITE_URL}/dashboard/stays?open=tours" style="display: inline-block; background: #1081b8; color: #ffffff; text-decoration: none; font-weight: 700; padding: 12px 22px; border-radius: 999px;">See the waiting list</a>
        </p>
      `),
    });
  } catch (err) {
    console.error("Waiting list notification failed", err);
  }
}

/** "Fri 12 September 2026 to Sun 14 September 2026, 2 nights" */
export function describeStay(checkIn: string, checkOut: string, nights: number): string {
  return `${longDate(checkIn)} to ${longDate(checkOut)}, ${nights} ${nights === 1 ? "night" : "nights"}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
