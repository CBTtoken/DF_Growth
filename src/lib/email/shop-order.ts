import { sendEmail } from "@/lib/email/resend";
import { describeLine, type OrderLine } from "@/lib/orders/line-items";

/**
 * The two emails a shop order sends.
 *
 * One to the seller, always, because on the no-gateway path it is the only
 * thing that tells them money is waiting to be collected. One to the buyer,
 * only if they gave an address, because the handoff makes email optional at
 * checkout and an optional field that is quietly required is worse than a
 * required one.
 *
 * Neither of them contains a bank account number. Handoff Sec 1.3: "Do not
 * publish the member's banking details on the site or in the buyer
 * confirmation." Published account details invite impersonation and there is
 * no way to police it, so the seller arranges payment directly and this only
 * tells the buyer to expect that.
 */

/** Anything a stranger typed goes through here before it reaches HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const rands = (cents: number) => `R${(cents / 100).toFixed(2)}`;

function itemsList(lines: OrderLine[]): string {
  return `<ul>${lines.map((line) => `<li>${escapeHtml(describeLine(line))} · ${rands(line.unit_price_cents * line.quantity)}</li>`).join("")}</ul>`;
}

export type ShopOrderEmailInput = {
  businessName: string;
  ownerEmail: string | null;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string | null;
  lines: OrderLine[];
  totalCents: number;
  deliveryCents: number | null;
  deliveryMethod: "delivery" | "collection";
  addressLine: string | null;
  paid: boolean;
  orderUrl: string;
  dashboardUrl: string;
};

export async function sendShopOrderToMember(input: ShopOrderEmailInput): Promise<void> {
  if (!input.ownerEmail) return;

  // The subject line has to work as a notification on a locked phone,
  // because that is where it will be read. The buyer's name and whether the
  // money has arrived are the two things worth the characters.
  const subject = input.paid
    ? `Paid order from ${input.buyerName}, ${rands(input.totalCents)}`
    : `New order from ${input.buyerName}, ${rands(input.totalCents)}`;

  const nextStep = input.paid
    ? `<p>The money is in your account. All that is left is to send it.</p>`
    : `<p><strong>Payment has not been collected.</strong> Contact ${escapeHtml(input.buyerName)} on
       <a href="tel:${escapeHtml(input.buyerPhone)}">${escapeHtml(input.buyerPhone)}</a> to arrange
       payment before you send anything. Once they have paid, mark the order as paid in your
       dashboard so your figures stay right.</p>`;

  const result = await sendEmail({
    to: input.ownerEmail,
    subject,
    html: `
      <p>Good day ${escapeHtml(input.businessName)},</p>
      <p>You have a new order from your shop.</p>
      ${itemsList(input.lines)}
      <p><strong>Total:</strong> ${rands(input.totalCents)}${
        input.deliveryCents === null
          ? " plus delivery, which you still need to quote"
          : input.deliveryCents > 0
            ? ` (includes ${rands(input.deliveryCents)} delivery)`
            : ""
      }</p>
      <p><strong>${input.deliveryMethod === "collection" ? "Collecting" : "Deliver to"}:</strong> ${
        input.addressLine ? escapeHtml(input.addressLine) : "Collection, arrange a time with the buyer"
      }</p>
      <p><strong>Buyer:</strong> ${escapeHtml(input.buyerName)} · ${escapeHtml(input.buyerPhone)}${
        input.buyerEmail ? ` · ${escapeHtml(input.buyerEmail)}` : ""
      }</p>
      ${nextStep}
      <p><a href="${input.dashboardUrl}">Open your orders</a></p>
    `,
  });

  if (!result.ok) {
    console.error("Shop order member email failed", input.ownerEmail, result.error);
  }
}

/**
 * The buyer asked where their orders got to.
 *
 * Sent only to the address that already owns the orders, which is what
 * makes this safe without a password: knowing an email address gets you
 * nothing unless you can also read that inbox. It is the same reasoning a
 * magic link runs on, without asking anybody to create an account to buy a
 * bracelet.
 */
export async function sendOrderLookupEmail({
  to,
  businessName,
  orders,
}: {
  to: string;
  businessName: string;
  orders: { reference: string; placedOn: string; totalCents: number; status: string; url: string }[];
}): Promise<void> {
  const rows = orders
    .map(
      (order) =>
        `<li><a href="${order.url}">Order ${escapeHtml(order.reference)}</a> · ${escapeHtml(
          order.placedOn
        )} · ${rands(order.totalCents)} · ${escapeHtml(order.status)}</li>`
    )
    .join("");

  const result = await sendEmail({
    to,
    subject: `Your orders from ${businessName}`,
    fromName: businessName,
    html: `
      <p>Good day,</p>
      <p>Here are the orders placed from ${escapeHtml(businessName)} with this email address.</p>
      <ul>${rows}</ul>
      <p>Each link shows that order's current status. Keep this email if you want to check back later.</p>
      <p>If you did not ask for this, you can ignore it. Nothing has changed on your orders.</p>
    `,
  });

  if (!result.ok) {
    console.error("Order lookup email failed", to, result.error);
  }
}

export async function sendShopOrderToBuyer(input: ShopOrderEmailInput): Promise<void> {
  if (!input.buyerEmail) return;

  // Sent under the seller's name with replies going to the seller. The
  // buyer bought from them, not from us, and an email that arrives from a
  // brand they have never heard of reads as a phishing attempt.
  const result = await sendEmail({
    to: input.buyerEmail,
    subject: `Your order from ${input.businessName}`,
    fromName: input.businessName,
    replyTo: input.ownerEmail ?? undefined,
    html: `
      <p>Good day ${escapeHtml(input.buyerName)},</p>
      <p>Thank you for your order from ${escapeHtml(input.businessName)}.</p>
      ${itemsList(input.lines)}
      <p><strong>Total:</strong> ${rands(input.totalCents)}</p>
      ${
        input.paid
          ? `<p>Your payment has gone through. ${escapeHtml(input.businessName)} will be in touch about ${
              input.deliveryMethod === "collection" ? "collection" : "delivery"
            }.</p>`
          : `<p>${escapeHtml(input.businessName)} will contact you on ${escapeHtml(
              input.buyerPhone
            )} within one working day to arrange payment and ${
              input.deliveryMethod === "collection" ? "a collection time" : "delivery"
            }.</p>
             <p>They will confirm how to pay when they speak to you. Nobody from this order will send
             you banking details by email, so treat any message that does as suspicious.</p>`
      }
      <p><a href="${input.orderUrl}">Track your order</a>. That link shows where it is up to
      whenever you open it, so it is worth keeping.</p>
    `,
  });

  if (!result.ok) {
    console.error("Shop order buyer email failed", input.buyerEmail, result.error);
  }
}
