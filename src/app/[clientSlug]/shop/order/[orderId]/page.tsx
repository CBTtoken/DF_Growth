import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ClearCart } from "@/components/shop/ClearCart";
import { addressLineOf, notifyOrderPlaced } from "@/lib/shop/notify";
import { verifyMemberPayment } from "@/lib/shop/gateway";
import { getShopOwner } from "@/lib/shop/queries";
import { addressParts, describeLine, type DeliveryAddress, type OrderLine } from "@/lib/orders/line-items";
import { readableTextOn } from "@/lib/color";

// Never cached and never indexed. This is one buyer's own order, it changes
// the moment a payment is confirmed, and a cached copy of somebody's
// confirmation is the kind of thing that gets served to the wrong person.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ clientSlug: string; orderId: string }>;
}) {
  const { clientSlug, orderId } = await params;

  // A malformed id is a 404 rather than a database error page. This route is
  // reachable by anybody typing into the address bar.
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return notFound();

  const owner = await getShopOwner(clientSlug);
  if (!owner) return notFound();

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("shop_orders")
    .select(
      "id, line_items, subtotal_cents, discount_cents, shipping_cents, total_cents, customer_name, customer_email, customer_phone, delivery_address, delivery_method, payment_status, paystack_reference, created_at"
    )
    .eq("id", orderId)
    .eq("growth_client_id", owner.id)
    .maybeSingle();

  if (!order) return notFound();

  const paid = await settlePayment(owner, order, clientSlug);
  const lines = (order.line_items ?? []) as OrderLine[];
  const primaryColor = owner.brand_primary_color ?? "#1081b8";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      {/* The basket emptied before the buyer left for the payment page, so
          this is only ever a second line of defence: somebody who abandoned
          a hosted checkout and came back by the browser's back button. */}
      <ClearCart />

      <div className="flex flex-col items-center gap-3 text-center">
        <span
          className="grid size-14 place-items-center rounded-full text-2xl"
          style={{ backgroundColor: primaryColor, color: readableTextOn(primaryColor) }}
          aria-hidden
        >
          ✓
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          {paid ? "Payment received" : "Order received"}
        </h1>
        <p className="max-w-md text-gray-600">
          {paid
            ? `Thank you, ${firstName(order.customer_name)}. ${owner.business_name} has your payment and will be in touch about ${order.delivery_method === "collection" ? "collection" : "delivery"}.`
            : `Thank you, ${firstName(order.customer_name)}. ${owner.business_name} will contact you on ${order.customer_phone ?? "the number you gave"} within one working day to arrange payment and ${order.delivery_method === "collection" ? "a collection time" : "delivery"}.`}
        </p>
        <p className="text-xs uppercase tracking-wide text-gray-400">
          Order {shortReference(order.id)}
        </p>
      </div>

      {/* The way back, without an account.
          This page is the order's own status: it shows live payment and
          fulfilment state every time it is opened. A buyer who gave an email
          also has it in their inbox and can ask for it again; a buyer who
          gave only a phone number has this page and nothing else, so they
          are told plainly to keep it. */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
        <p className="font-medium text-gray-800">Keep this page to check on your order</p>
        <p className="mt-1 text-gray-600">
          {order.customer_email
            ? "It shows where your order is up to whenever you open it. We have also emailed you the link."
            : "It shows where your order is up to whenever you open it. Bookmark it or send yourself the link, because you did not give an email address."}
        </p>
        {order.customer_email && (
          <Link
            href={`/${clientSlug}/shop/orders`}
            className="mt-2 inline-block font-semibold underline-offset-2 hover:underline"
            style={{ color: primaryColor }}
          >
            Lost the link? Have it emailed again
          </Link>
        )}
      </div>

      {/* Said plainly, because the most common way somebody loses money on a
          sale like this is a stranger messaging them account details and
          claiming to be the seller. Handoff Sec 1.3 is why no banking
          detail appears anywhere on this page or in the buyer's email. */}
      {!paid && (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {owner.business_name} will confirm how to pay when they speak to you. Nobody will send you
          banking details by email or message before then, so treat anything that does as suspicious.
        </p>
      )}

      <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">What you ordered</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {lines.map((line, i) => (
            <li key={line.variant_id ?? i} className="flex justify-between gap-4">
              <span className="text-gray-700">{describeLine(line)}</span>
              <span className="shrink-0 font-medium text-gray-900">
                R{((line.unit_price_cents * line.quantity) / 100).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 flex flex-col gap-1 border-t border-gray-100 pt-3 text-sm">
          {order.discount_cents > 0 && (
            <div className="flex justify-between text-gray-600">
              <dt>Discount</dt>
              <dd>-R{(order.discount_cents / 100).toFixed(2)}</dd>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <dt>{order.delivery_method === "collection" ? "Collection" : "Delivery"}</dt>
            <dd>{order.shipping_cents > 0 ? `R${(order.shipping_cents / 100).toFixed(2)}` : "Included"}</dd>
          </div>
          <div className="flex justify-between border-t border-gray-100 pt-1 text-base font-bold text-gray-900">
            <dt>Total</dt>
            <dd>R{(order.total_cents / 100).toFixed(2)}</dd>
          </div>
        </dl>

        {order.delivery_method === "delivery" && (
          <p className="mt-4 border-t border-gray-100 pt-3 text-sm text-gray-600">
            <span className="font-medium text-gray-700">Delivering to:</span>{" "}
            {formatShort(order.delivery_address as DeliveryAddress)}
          </p>
        )}
      </section>

      <div className="mt-8 flex flex-col items-center gap-2 text-sm">
        <Link
          href={`/${clientSlug}/shop`}
          className="rounded-full px-6 py-3 font-semibold"
          style={{ backgroundColor: primaryColor, color: readableTextOn(primaryColor) }}
        >
          Keep shopping
        </Link>
        <p className="text-gray-500">
          Questions? Contact {owner.business_name}
          {owner.call_phone || owner.whatsapp_phone ? ` on ${owner.call_phone ?? owner.whatsapp_phone}` : ""}.
        </p>
      </div>
    </div>
  );
}

/**
 * Confirms a payment with Paystack, once, on the way back from their page.
 *
 * Never trusts the redirect. The buyer arrives here through a URL, and a URL
 * is a thing anybody can retype, so the only acceptable evidence that money
 * moved is Paystack's own answer when asked directly.
 *
 * The write is guarded on the current status rather than on a flag of our
 * own: the update only matches a row that is still unpaid, so a buyer who
 * refreshes this page five times moves the order to paid once and sends one
 * pair of emails. That is the same reasoning as keying dedup on the
 * provider's reference rather than on anything derived from user input.
 */
async function settlePayment(
  owner: Awaited<ReturnType<typeof getShopOwner>> & object,
  order: {
    id: string;
    payment_status: string;
    paystack_reference: string | null;
    line_items: unknown;
    total_cents: number;
    shipping_cents: number;
    customer_name: string;
    customer_email: string | null;
    customer_phone: string | null;
    delivery_address: unknown;
    delivery_method: string;
  },
  clientSlug: string
): Promise<boolean> {
  if (order.payment_status === "paid") return true;
  if (!order.paystack_reference || !owner.hasGateway) return false;

  const result = await verifyMemberPayment(owner.id, order.paystack_reference);
  if (!result.paid) return false;

  const admin = createAdminClient();
  const { data: transitioned } = await admin
    .from("shop_orders")
    .update({ payment_status: "paid", updated_at: new Date().toISOString() })
    .eq("id", order.id)
    .eq("payment_status", "unpaid")
    .select("id");

  // Empty means another render of this page already did it. The order is
  // paid either way, and only the render that actually moved it sends mail.
  if (transitioned && transitioned.length > 0) {
    const parts = addressParts(order.delivery_address as DeliveryAddress);
    const method = order.delivery_method === "collection" ? "collection" : "delivery";
    await notifyOrderPlaced({
      owner,
      orderPath: `/${clientSlug}/shop/order/${order.id}`,
      lineItems: (order.line_items ?? []) as OrderLine[],
      totalCents: order.total_cents,
      shippingCents: order.shipping_cents,
      deliveryMethod: method,
      buyerName: order.customer_name,
      buyerPhone: order.customer_phone ?? "",
      buyerEmail: order.customer_email,
      addressLine: addressLineOf(method, {
        line1: parts.line1,
        suburb: parts.suburb,
        city: parts.city,
        postalCode: parts.postalCode,
      }),
      paid: true,
    });
  }

  return true;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "there";
}

/** The last block of the uuid, which is short enough to read down a phone. */
function shortReference(id: string): string {
  return id.split("-").pop()?.toUpperCase() ?? id;
}

function formatShort(address: DeliveryAddress): string {
  const parts = addressParts(address);
  return [parts.line1, parts.suburb, parts.city, parts.postalCode].filter(Boolean).join(", ");
}
