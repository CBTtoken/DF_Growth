"use client";

import Link from "next/link";
import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/shop/CartProvider";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";
import { placeShopOrder, type CheckoutState } from "@/app/[clientSlug]/shop-actions";
import { deliveryChargeCents, deliveryChargeLabel, type ShopDeliverySettings } from "@/lib/shop/delivery";
import { shopImageUrl } from "@/lib/shop/queries";
import { readableTextOn } from "@/lib/color";

/**
 * One screen, and it has to be finishable on a phone in under a minute.
 *
 * Handoff Sec 1.3 and acceptance criterion 4. So: no account, no step
 * counter, no address lookup, no card fields of our own. The fields are the
 * ones needed to fulfil the order and nothing else, and the total is broken
 * out above the button rather than revealed after it.
 *
 * The figures shown here are the buyer's preview. The server recalculates
 * every one of them from the database before it charges anybody, and the
 * only job this arithmetic has is to agree with it.
 */
export function CheckoutForm({
  clientSlug,
  businessName,
  primaryColor,
  delivery,
  hasGateway,
  collectionAddressLine,
}: {
  clientSlug: string;
  businessName: string;
  primaryColor: string;
  delivery: ShopDeliverySettings;
  hasGateway: boolean;
  collectionAddressLine: string | null;
}) {
  const { lines, ready, itemCount, goodsCents, setQuantity, remove, clear } = useCart();
  const router = useRouter();

  const canCollect = delivery.mode === "collection_only" || Boolean(collectionAddressLine);
  const canDeliver = delivery.mode !== "collection_only";
  const [method, setMethod] = useState<"delivery" | "collection">(canDeliver ? "delivery" : "collection");
  const [showCoupon, setShowCoupon] = useState(false);

  const cartLines = lines.map((l) => ({
    productId: l.productId,
    variantId: l.variantId,
    quantity: l.quantity,
  }));

  const boundAction = placeShopOrder.bind(null, clientSlug, cartLines);
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(boundAction, null);

  // The basket is emptied only once the order exists, never before. Clearing
  // it optimistically would lose somebody's basket on a failed submit, which
  // on a phone on bad signal is not a rare event.
  useEffect(() => {
    if (!state?.redirectTo) return;
    clear();
    if (state.external) {
      window.location.href = state.redirectTo;
    } else {
      router.push(state.redirectTo);
    }
  }, [state, clear, router]);

  const shippingCents = deliveryChargeCents(delivery, goodsCents, method);
  const totalCents = goodsCents + (shippingCents ?? 0);
  const buttonText = readableTextOn(primaryColor);

  if (!ready) {
    return <p className="py-16 text-center text-sm text-gray-400">Loading your basket...</p>;
  }

  if (itemCount === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-gray-600">Your basket is empty.</p>
        <Link
          href={`/${clientSlug}/shop`}
          className="rounded-full px-6 py-3 text-sm font-semibold"
          style={{ backgroundColor: primaryColor, color: buttonText }}
        >
          Browse the shop
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <form action={formAction} className="flex flex-col gap-6">
        <input type="hidden" name="deliveryMethod" value={method} />

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Your details</h2>
          <Field label="Your name" error={state?.error?.customerName}>
            <input
              name="customerName"
              required
              autoComplete="name"
              className="h-12 w-full rounded-xl border border-gray-300 px-4 text-gray-900"
            />
          </Field>
          {/* The phone number is the one field that cannot be skipped. On the
              path where the seller has no gateway, which is the normal one,
              this is the entire mechanism by which the sale completes. */}
          <Field
            label="Phone number"
            hint={hasGateway ? undefined : `${businessName} will contact you on this number to arrange payment.`}
            error={state?.error?.customerPhone}
          >
            <input
              name="customerPhone"
              type="tel"
              required
              autoComplete="tel"
              inputMode="tel"
              className="h-12 w-full rounded-xl border border-gray-300 px-4 text-gray-900"
            />
          </Field>
          <Field
            label={hasGateway ? "Email" : "Email (optional)"}
            hint={hasGateway ? "Your payment receipt goes here." : "Only if you would like a receipt by email."}
            error={state?.error?.customerEmail}
          >
            <input
              name="customerEmail"
              type="email"
              required={hasGateway}
              autoComplete="email"
              inputMode="email"
              className="h-12 w-full rounded-xl border border-gray-300 px-4 text-gray-900"
            />
          </Field>
        </section>

        {canCollect && canDeliver && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">How would you like it</h2>
            <div className="grid grid-cols-2 gap-2">
              <MethodButton active={method === "delivery"} onClick={() => setMethod("delivery")} primaryColor={primaryColor}>
                Deliver to me
              </MethodButton>
              <MethodButton active={method === "collection"} onClick={() => setMethod("collection")} primaryColor={primaryColor}>
                I will collect
              </MethodButton>
            </div>
          </section>
        )}

        {method === "collection" ? (
          <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
            {collectionAddressLine
              ? `Collect from ${collectionAddressLine}. ${businessName} will confirm a time with you.`
              : `${businessName} will confirm a collection time and place with you.`}
          </p>
        ) : (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Delivery address</h2>
            <Field label="Street address" error={state?.error?.line1}>
              <input
                name="line1"
                autoComplete="address-line1"
                className="h-12 w-full rounded-xl border border-gray-300 px-4 text-gray-900"
              />
            </Field>
            <Field label="Complex, unit or suburb (optional)" error={state?.error?.suburb}>
              <input
                name="suburb"
                autoComplete="address-level3"
                className="h-12 w-full rounded-xl border border-gray-300 px-4 text-gray-900"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City or town" error={state?.error?.city}>
                <input
                  name="city"
                  autoComplete="address-level2"
                  className="h-12 w-full rounded-xl border border-gray-300 px-4 text-gray-900"
                />
              </Field>
              <Field label="Postal code" error={state?.error?.postalCode}>
                <input
                  name="postalCode"
                  autoComplete="postal-code"
                  inputMode="numeric"
                  className="h-12 w-full rounded-xl border border-gray-300 px-4 text-gray-900"
                />
              </Field>
            </div>
          </section>
        )}

        {showCoupon ? (
          <Field label="Discount code" error={state?.error?.couponCode}>
            <input
              name="couponCode"
              autoCapitalize="characters"
              className="h-12 w-full rounded-xl border border-gray-300 px-4 uppercase text-gray-900"
            />
          </Field>
        ) : (
          <button
            type="button"
            onClick={() => setShowCoupon(true)}
            className="self-start text-sm font-medium text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
          >
            I have a discount code
          </button>
        )}

        {/* Marketing is a separate, unticked question, and stays that way.
            Bundling it into the act of buying is precisely the kind of
            bundled consent POPIA does not accept. */}
        <label className="flex items-start gap-2.5 text-sm text-gray-600">
          <input type="checkbox" name="marketingConsent" className="mt-0.5 size-4 shrink-0" />
          <span>Let {businessName} tell me about new products and specials.</span>
        </label>

        {/* Said before the button, not buried in a policy nobody opens.
            POPIA asks that a person knows what is being collected, what for,
            and who receives it, and the honest answer here is short: the
            seller needs it to get the order to you, and the seller is who
            gets it. Naming them rather than us also matters, because they
            are the ones who will phone. */}
        <p className="text-xs leading-relaxed text-gray-500">
          Your name, number and address are used to fulfil this order and are shared with{" "}
          {businessName}, who is the seller. DigitalFlyer stores them on their behalf and does not
          sell them to anyone. See our{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-gray-700">
            privacy policy
          </Link>
          .
        </p>

        {/* Invisible unless Cloudflare thinks the visitor needs checking, so
            an ordinary buyer never sees anything. Checkout was the last
            public form here without one. */}
        <TurnstileWidget />

        {state?.error?._form && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error._form[0]}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full px-6 py-4 text-base font-semibold shadow-sm disabled:opacity-60"
          style={{ backgroundColor: primaryColor, color: buttonText }}
        >
          {pending
            ? "Just a moment..."
            : hasGateway
              ? `Pay R${(totalCents / 100).toFixed(2)}`
              : "Place my order"}
        </button>

        {/* What happens next, said before they commit rather than after.
            The unpaid path is the common one and it must not read as
            broken, which means the buyer has to know it is deliberate. */}
        <p className="text-center text-xs text-gray-500">
          {hasGateway
            ? `You will be taken to a secure payment page. Your card details never touch this site.`
            : `${businessName} will contact you within one working day to arrange payment. Nothing is charged now.`}
        </p>
      </form>

      <aside className="order-first flex flex-col gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 lg:order-none lg:sticky lg:top-24 lg:self-start">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Your basket</h2>
        <ul className="flex flex-col gap-3">
          {lines.map((line) => (
            <li key={`${line.productId}:${line.variantId ?? ""}`} className="flex gap-3">
              <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-white">
                {line.imagePath && (
                  <Image src={shopImageUrl(line.imagePath)} alt="" fill sizes="56px" className="object-cover" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <Link
                  href={`/${clientSlug}/shop/${line.productSlug}`}
                  className="block truncate text-sm font-medium text-gray-900 hover:underline"
                >
                  {line.title}
                </Link>
                {line.variantLabel && <span className="block text-xs text-gray-500">{line.variantLabel}</span>}
                <span className="mt-1 flex items-center gap-2">
                  <select
                    value={line.quantity}
                    onChange={(e) => setQuantity(line.productId, line.variantId, Number(e.target.value))}
                    aria-label={`Quantity of ${line.title}`}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900"
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => remove(line.productId, line.variantId)}
                    className="text-xs text-gray-500 underline-offset-2 hover:text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-gray-900">
                R{((line.unitPriceCents * line.quantity) / 100).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="flex flex-col gap-1 border-t border-gray-200 pt-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <dt>Items</dt>
            <dd>R{(goodsCents / 100).toFixed(2)}</dd>
          </div>
          <div className="flex justify-between text-gray-600">
            <dt>{method === "collection" ? "Collection" : "Delivery"}</dt>
            <dd>{method === "collection" ? "Free" : deliveryChargeLabel(shippingCents)}</dd>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-1 text-base font-bold text-gray-900">
            <dt>Total</dt>
            <dd>R{(totalCents / 100).toFixed(2)}</dd>
          </div>
        </dl>

        {shippingCents === null && method === "delivery" && (
          <p className="text-xs text-gray-500">
            Delivery is quoted per order. {businessName} confirms the cost with you before you pay.
          </p>
        )}
      </aside>
    </div>
  );
}

function MethodButton({
  active,
  onClick,
  primaryColor,
  children,
}: {
  active: boolean;
  onClick: () => void;
  primaryColor: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
        active ? "border-transparent" : "border-gray-300 text-gray-700 hover:border-gray-400"
      }`}
      style={active ? { backgroundColor: primaryColor, color: readableTextOn(primaryColor) } : undefined}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
      {hint && !error && <span className="text-xs text-gray-500">{hint}</span>}
      {error && <span className="text-xs text-red-600">{error[0]}</span>}
    </label>
  );
}
