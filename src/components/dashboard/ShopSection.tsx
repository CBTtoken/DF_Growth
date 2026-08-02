"use client";

import { useState, useTransition, useActionState, useRef, useEffect } from "react";
import Papa from "papaparse";
import Image from "next/image";
import {
  setShopEnabled,
  saveCollectionAddress,
  saveProduct,
  deleteProduct,
  toggleProductActive,
  toggleProductFeatured,
  uploadProductImage,
  removeProductImage,
  makeProductImagePrimary,
  saveProductOption,
  deleteProductOption,
  bulkUploadProducts,
  saveCoupon,
  deleteCoupon,
  saveShopDelivery,
  connectBobGo,
  disconnectBobGo,
  type CsvRowError,
} from "@/app/dashboard/shop-actions";
import { SHOP_CSV_COLUMNS } from "@/lib/schemas/shop";
import { shopImageUrl } from "@/lib/shop/queries";
import { Card } from "@/components/ui/Card";

export type ShopVariantRow = {
  id: string;
  sku: string;
  descriptor: Record<string, string> | null;
  price_cents: number | null;
  stock_quantity: number;
  is_active: boolean;
};

export type ShopProduct = {
  id: string;
  slug: string;
  title: string;
  sku: string;
  description: string | null;
  base_price_cents: number;
  image_paths: string[];
  is_featured: boolean;
  track_stock: boolean;
  weight_kg: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  status: "draft" | "active" | "archived";
  stock_quantity: number;
  variants: ShopVariantRow[];
};

/** An option is a variant with something written on it. */
function namedOptions(product: ShopProduct): ShopVariantRow[] {
  return product.variants.filter((v) => Object.keys(v.descriptor ?? {}).length > 0);
}

function optionLabel(variant: ShopVariantRow): string {
  return Object.values(variant.descriptor ?? {}).filter(Boolean).join(", ");
}

export type ShopCoupon = {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
};

export type ShopOrder = {
  id: string;
  line_items: { title: string; quantity: number; sku: string }[];
  total_cents: number;
  customer_name: string;
  customer_email: string;
  payment_status: string;
  fulfilment_status: string;
  created_at: string;
};

export type ShopCollectionAddress = { line1: string; city: string; postalCode: string } | null;

// docs/GROWTH_BOOKING_SHOP_MODULES_CLAUDE.md Sec 4.5: Inventory, Shipping
// (collection address for now — Sprint 5 adds live courier config),
// Payments (Sprint 4), Coupons as sub-sections. Sprint 3 stub: orders
// confirm unpaid, same reasoning as Booking's Sprint 2 stub.
export function ShopSection({
  shopEnabled,
  shopSlug,
  products,
  coupons,
  orders,
  collectionAddress,
  deliveryMode,
  flatDeliveryCents,
  freeDeliveryOverCents,
  bobgoConnectedAt,
  bobgoSandbox,
  bobgoLastError,
}: {
  shopEnabled: boolean;
  /** The member's own slug, so every product links to its real live page. */
  shopSlug: string | null;
  products: ShopProduct[];
  coupons: ShopCoupon[];
  orders: ShopOrder[];
  collectionAddress: ShopCollectionAddress;
  deliveryMode: string;
  flatDeliveryCents: number;
  freeDeliveryOverCents: number | null;
  bobgoConnectedAt: string | null;
  bobgoSandbox: boolean;
  bobgoLastError: string | null;
}) {
  const [enabled, setEnabled] = useState(shopEnabled);
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCouponForm, setShowCouponForm] = useState(false);

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      const result = await setShopEnabled(next);
      if (result.error) setEnabled(!next);
    });
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-ink">Shop</h2>
          <p className="mt-1 text-sm text-gray-500">Sell products directly from your page.</p>
          {enabled && shopSlug && (
            <a
              href={`/${shopSlug}/shop`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm font-semibold text-brand underline-offset-2 hover:underline"
            >
              View my shop →
            </a>
          )}
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${enabled ? "bg-brand" : "bg-gray-300"}`}
          aria-pressed={enabled}
          aria-label="Toggle Shop"
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>

      {enabled && (
        <div className="flex flex-col gap-6 border-t border-gray-100 pt-4">
          <BobGoConnect
            connectedAt={bobgoConnectedAt}
            sandbox={bobgoSandbox}
            lastError={bobgoLastError}
            hasDimensions={products.length === 0 || products.some((p) => p.weight_kg > 0 && p.length_cm > 0)}
          />
          <CollectionAddressForm address={collectionAddress} />
          <DeliveryForm
            mode={deliveryMode}
            flatDeliveryCents={flatDeliveryCents}
            freeOverCents={freeDeliveryOverCents}
          />

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-gray-800">Products</h3>
            {/* Handoff Sec 1.1: the member chooses what is featured, and if
                they have not chosen, the landing page falls back to the most
                recently added. Said out loud here so a member who never
                touches a star still knows what their page is showing. */}
            <p className="text-xs text-gray-500">
              Star up to three products to show them on your landing page. Star none and your three
              newest are shown.
            </p>
            {products.length === 0 && (
              <p className="text-sm text-gray-400">No products yet. Add one below, or upload a spreadsheet.</p>
            )}
            <ul className="flex flex-col gap-2">
              {products.map((p) => (
                <ProductRow key={p.id} product={p} shopSlug={shopSlug} />
              ))}
            </ul>
            <CsvUpload />
            {showAddForm ? (
              <ProductForm onDone={() => setShowAddForm(false)} />
            ) : (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="self-start rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-400"
              >
                + Add a product
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-800">Coupons</h3>
            <ul className="flex flex-col gap-2">
              {coupons.map((c) => (
                <CouponRow key={c.id} coupon={c} />
              ))}
              {coupons.length === 0 && <p className="text-sm text-gray-400">No coupons yet.</p>}
            </ul>
            {showCouponForm ? (
              <CouponForm onDone={() => setShowCouponForm(false)} />
            ) : (
              <button
                type="button"
                onClick={() => setShowCouponForm(true)}
                className="self-start rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-400"
              >
                + Add a coupon
              </button>
            )}
          </div>

          {/* Recent orders only, and deliberately read-only.
              The full orders module lives on Overview: summary figures,
              batches, personalisation details and the CSV exports for the
              printer and courier. Both read the same shop_orders rows, so
              a second set of buttons here would be two ways to do the same
              thing that can disagree about what has shipped. */}
          <div className="flex flex-col gap-3 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-800">Recent orders</h3>
            {orders.length === 0 ? (
              <p className="text-sm text-gray-400">No orders yet.</p>
            ) : (
              <>
                <ul className="flex flex-col gap-2">
                  {orders.slice(0, 5).map((o) => (
                    <OrderRow key={o.id} order={o} />
                  ))}
                </ul>
                <p className="text-xs text-gray-500">
                  Batches, personalisation details and the spreadsheets for your printer and courier
                  are under Orders on the Overview tab.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function CollectionAddressForm({ address }: { address: ShopCollectionAddress }) {
  const [state, formAction, pending] = useActionState(saveCollectionAddress, null);
  return (
    <form action={formAction} className="flex flex-col gap-3 border-b border-gray-100 pb-5 text-sm">
      <h3 className="text-sm font-semibold text-gray-800">Collection address</h3>
      {/* Dewald, 2026-07-30, on how the book actually ships: "our orders
          will always be shipped by our printer and will as such use their
          collections address... Bob Go will pick it up there, always."
          The old wording said "where couriers pick up orders from", which
          reads as "your premises" and would have had him typing his own
          address for parcels that are sitting at a printer in another
          town. The courier goes where the stock is, which is often not
          where the seller is. */}
      <p className="text-xs text-gray-500">
        Where the courier collects the parcels. This is wherever the stock physically sits, so if a
        printer, supplier or warehouse packs and holds your orders, use their address rather than
        your own.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <input name="line1" defaultValue={address?.line1} placeholder="Address" required className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
        <input name="city" defaultValue={address?.city} placeholder="City" required className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
        <input name="postalCode" defaultValue={address?.postalCode} placeholder="Postal code" required className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
      </div>
      {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}
      <button type="submit" disabled={pending} className="self-start rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
        {pending ? "Saving..." : "Save address"}
      </button>
    </form>
  );
}

/**
 * What the member charges for delivery, until live courier rates exist.
 *
 * Checkout charged R0 before this, which was not a neutral default: it
 * quietly handed the member's courier bill to the member on a sale where
 * they had already priced the goods assuming delivery was covered. No
 * member shop had gone live yet, so this landed before anyone was burned.
 *
 * Asked as one number on purpose. A member who does not know their own
 * average courier cost is not helped by a zone table, and a wrong number in
 * a zone table is much harder to spot than a wrong single number.
 */
function DeliveryForm({
  mode,
  flatDeliveryCents,
  freeOverCents,
}: {
  mode: string;
  flatDeliveryCents: number;
  freeOverCents: number | null;
}) {
  const [state, formAction, pending] = useActionState(saveShopDelivery, null);
  const [chosen, setChosen] = useState(mode);
  const rands = (cents: number | null) => (cents == null ? "" : (cents / 100).toFixed(2));

  // Handoff Sec 1.5: "Member sets, per shop: collection only, flat rate
  // delivery, free over a threshold, or quote on request."
  //
  // Before this there was only one answer available. A member who does
  // collection only had to set the flat rate to zero and hope nobody read
  // that as free nationwide delivery, and a member who works out courier
  // cost by hand had no way to say so at all.
  const options: [string, string, string][] = [
    ["collection_only", "Collection only", "Buyers collect from you. No address is asked for and nothing is added."],
    ["flat", "One delivery charge", "The same amount on every order, anywhere in South Africa."],
    [
      "quote_on_request",
      "I quote delivery per order",
      "The order is taken with an address and no delivery charge. You confirm the cost with the buyer.",
    ],
  ];

  return (
    <form action={formAction} className="flex flex-col gap-3 border-b border-gray-100 pb-5 text-sm">
      <h3 className="text-sm font-semibold text-gray-800">Delivery</h3>
      <p className="text-xs text-gray-500">
        How buyers get their order. Whatever you pick is shown on your shop and again at checkout,
        before anybody pays.
      </p>

      <div className="flex flex-col gap-2">
        {options.map(([value, label, help]) => (
          <label
            key={value}
            className={`flex cursor-pointer gap-2.5 rounded-xl border p-3 ${
              chosen === value ? "border-brand bg-brand/5" : "border-gray-200"
            }`}
          >
            <input
              type="radio"
              name="mode"
              value={value}
              checked={chosen === value}
              onChange={() => setChosen(value)}
              className="mt-0.5 size-4 shrink-0"
            />
            <span>
              <span className="block font-medium text-gray-800">{label}</span>
              <span className="block text-xs text-gray-500">{help}</span>
            </span>
          </label>
        ))}
      </div>

      {/* Only shown for the one mode that uses them. Leaving two amount
          boxes on screen under "Collection only" is an invitation to fill
          them in and then wonder why nobody is being charged. */}
      {chosen === "flat" && (
        <>
          <p className="text-xs text-gray-500">
            One number covers every address, so it will over-recover on a nearby delivery and
            under-recover on a far one. Pick something close to your average. Live courier rates for
            the buyer&apos;s actual address replace this once your courier account is connected.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Delivery per order (R)</span>
              <input
                name="flatDelivery"
                type="number"
                min="0"
                step="0.01"
                defaultValue={rands(flatDeliveryCents)}
                placeholder="0.00"
                className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Free delivery over (R, optional)</span>
              <input
                name="freeDeliveryOver"
                type="number"
                min="1"
                step="0.01"
                defaultValue={rands(freeOverCents)}
                placeholder="Leave blank for none"
                className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
              />
            </label>
          </div>
        </>
      )}

      {/* The amounts still have to reach the server when the boxes are not
          on screen, otherwise switching to collection and back would wipe a
          charge the member set weeks ago. */}
      {chosen !== "flat" && (
        <>
          <input type="hidden" name="flatDelivery" value={rands(flatDeliveryCents) || "0"} />
          <input type="hidden" name="freeDeliveryOver" value={rands(freeOverCents)} />
        </>
      )}

      {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}
      {state?.success && <p className="text-xs text-green-600">Saved. Buyers see this at checkout now.</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save delivery"}
      </button>
    </form>
  );
}

/**
 * Connecting the member's own Bob Go account.
 *
 * Dewald, 2026-07-30, on the two audiences: "we want to guide the new
 * member to open their own account but ours already is." Same connect step
 * either way, so the difference is one line of guidance rather than two
 * separate flows.
 *
 * Sandbox is ticked by default and stays visible after connecting, because
 * the failure mode of forgetting is a real courier arriving at somebody's
 * door for a test order.
 */
function BobGoConnect({
  connectedAt,
  sandbox,
  lastError,
  hasDimensions,
}: {
  connectedAt: string | null;
  sandbox: boolean;
  lastError: string | null;
  hasDimensions: boolean;
}) {
  const [state, formAction, pending] = useActionState(connectBobGo, null);
  const [isPending, startTransition] = useTransition();
  const connected = Boolean(connectedAt);

  return (
    <div className="flex flex-col gap-3 border-b border-gray-100 pb-5 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-800">Courier account</h3>
        {connected && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              sandbox ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-700"
            }`}
          >
            {sandbox ? "Connected, test mode" : "Connected, live"}
          </span>
        )}
      </div>

      {/* The last thing to go wrong, if anything did. An expired token stops
          quotes appearing at a stranger's checkout, hours after the member
          last looked at this screen, so it has to be said here. */}
      {connected && lastError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          <strong>Delivery quotes are failing:</strong> {lastError} Buyers are being charged your
          flat delivery amount instead. Reconnect below with a fresh token to fix it.
        </p>
      )}

      {connected ? (
        <>
          <p className="text-xs text-gray-500">
            Your Bob Go account is connected. Buyers now see live delivery prices for their own
            address at checkout, and shipments are booked on your account, in your name.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => startTransition(async () => { await disconnectBobGo(); })}
              disabled={isPending}
              className="self-start rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-400 disabled:opacity-50"
            >
              {isPending ? "Disconnecting..." : "Disconnect"}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-gray-500">
            Connect your own Bob Go account and buyers get live delivery prices for their exact
            address, instead of one flat amount. Shipments are booked on your account and billed to
            you, so the parcel stays yours end to end.
          </p>
          {/* These steps are the real screen, from a screenshot Dewald sent
              on 2026-07-30, not a guess. The earlier version said "Settings,
              then API", which does not exist. A wrong instruction here is
              worse than none: the member goes looking, does not find it, and
              concludes the feature is broken rather than that we were
              wrong. */}
          <ol className="flex list-decimal flex-col gap-1 pl-4 text-xs text-gray-600">
            <li>
              No account yet? Open one free at{" "}
              <a
                href="https://www.bobgo.co.za"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand underline-offset-2 hover:underline"
              >
                bobgo.co.za
              </a>
              . Already have one? Skip to step 2.
            </li>
            <li>
              In Bob Go, go to <strong>Settings</strong>, then the <strong>API keys</strong> tab, and
              create a key. You can also reach it through{" "}
              <strong>Add sales channel</strong>, under <strong>API channels</strong>.
            </li>
            <li>Paste the key below. We check it works before saving anything.</li>
          </ol>
          {/* Both routes to a key carry a crown icon in Bob Go's own menus,
              which normally marks a paid tier. Confirmed unresolved with
              them as at 2026-07-30. Said here because a member who follows
              these steps and hits a paywall should know it is Bob Go's
              pricing rather than something we broke. */}
          <p className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
            API access may need a paid Bob Go plan. If you reach their menu and the option is
            locked, that is Bob Go&apos;s own pricing rather than anything on our side. Your shop
            keeps working on your flat delivery charge in the meantime.
          </p>
        </>
      )}

      {!connected && (
        <form action={formAction} className="flex flex-col gap-2">
          <input
            name="bobgoToken"
            type="password"
            autoComplete="off"
            placeholder="Paste your Bob Go API token"
            className="rounded-lg border border-gray-300 px-3 py-2 font-mono text-gray-900"
          />
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" name="bobgoSandbox" defaultChecked className="size-4" />
            Test mode, using Bob Go&apos;s sandbox couriers. Leave this ticked until you have seen it
            working. Nothing real is collected or charged.
          </label>
          {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}
          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Checking with Bob Go..." : "Connect my Bob Go account"}
          </button>
        </form>
      )}

      {/* Dewald, 2026-07-30: "we will just need to ensure the member is well
          aware of this part and why it is important if they switch on
          shipping." Said where it bites, next to the thing that needs it,
          rather than buried in the product form they have already left. */}
      {!hasDimensions && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <strong>Add sizes and weights to your products first.</strong> A courier prices a parcel
          by how big and how heavy it is. Products left at zero will be quoted wrong, which means
          either you absorb the difference or your buyer is overcharged.
        </p>
      )}
    </div>
  );
}

function CsvUpload() {
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [errors, setErrors] = useState<CsvRowError[]>([]);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSuccessCount(null);
    setErrors([]);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => setRows(results.data),
    });
  }

  function handleUpload() {
    if (!rows) return;
    startTransition(async () => {
      const result = await bulkUploadProducts(rows);
      setSuccessCount(result.successCount);
      setErrors(result.errors);
      setRows(null);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm">
      <p className="text-xs text-gray-500">
        CSV columns: <code className="text-[11px]">{SHOP_CSV_COLUMNS.join(", ")}</code>
      </p>
      <input ref={inputRef} type="file" accept=".csv" onChange={handleFile} className="text-xs" />
      {rows && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={isPending}
          className="self-start rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {isPending ? "Uploading..." : `Upload ${rows.length} rows`}
        </button>
      )}
      {successCount !== null && <p className="text-xs text-green-700">{successCount} product(s) added.</p>}
      {errors.length > 0 && (
        <ul className="flex flex-col gap-0.5">
          {errors.map((e, i) => (
            <li key={i} className="text-xs text-red-600">
              Row {e.row}: {e.error}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * One product, and everything a member can do to it from a phone.
 *
 * Handoff acceptance criterion 8. So the controls are buttons at thumb size
 * rather than a row of tiny links, the picture manager is inline instead of
 * behind a modal, and nothing here needs a keyboard.
 */
function ProductRow({ product, shopSlug }: { product: ShopProduct; shopSlug: string | null }) {
  const [editing, setEditing] = useState(false);
  const [panel, setPanel] = useState<"none" | "pictures" | "options">("none");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const options = namedOptions(product);
  const stock = options.length > 0
    ? options.reduce((sum, o) => sum + o.stock_quantity, 0)
    : product.stock_quantity;

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  if (editing) return <ProductForm product={product} onDone={() => setEditing(false)} />;

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
      <div className="flex items-start gap-3">
        <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-gray-200">
          {product.image_paths[0] ? (
            <Image
              src={shopImageUrl(product.image_paths[0])}
              alt=""
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : (
            <span className="grid size-full place-items-center text-[10px] text-gray-400">No photo</span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">
            {product.title}
            {product.status !== "active" && (
              <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                Hidden
              </span>
            )}
          </p>
          <p className="text-xs text-gray-500">
            R{(product.base_price_cents / 100).toFixed(2)}
            {options.length > 0 ? ` · ${options.length} options` : ""}
            {product.track_stock ? ` · ${stock} in stock` : ""}
          </p>
          {shopSlug && product.status === "active" && (
            <a
              href={`/${shopSlug}/shop/${product.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-brand underline-offset-2 hover:underline"
            >
              /{shopSlug}/shop/{product.slug}
            </a>
          )}
        </div>

        {/* The star is the whole of "featured", and it is next to the
            product rather than in a separate list, because a member picking
            what goes on their landing page is looking at their products. */}
        <button
          type="button"
          onClick={() => run(() => toggleProductFeatured(product.id, !product.is_featured))}
          disabled={isPending}
          aria-pressed={product.is_featured}
          title={product.is_featured ? "Showing on your landing page" : "Show on your landing page"}
          className={`shrink-0 rounded-full px-2.5 py-1.5 text-base leading-none disabled:opacity-50 ${
            product.is_featured ? "bg-amber-100 text-amber-600" : "bg-white text-gray-300 ring-1 ring-gray-200"
          }`}
        >
          ★<span className="sr-only">Feature on landing page</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <RowButton onClick={() => setEditing(true)}>Edit</RowButton>
        <RowButton onClick={() => setPanel(panel === "pictures" ? "none" : "pictures")}>
          Pictures ({product.image_paths.length})
        </RowButton>
        <RowButton onClick={() => setPanel(panel === "options" ? "none" : "options")}>
          Options ({options.length})
        </RowButton>
        <RowButton
          onClick={() => run(() => toggleProductActive(product.id, product.status !== "active"))}
          disabled={isPending}
        >
          {product.status === "active" ? "Hide" : "Publish"}
        </RowButton>
        <RowButton
          onClick={() => {
            if (confirm(`Remove "${product.title}"?`)) run(() => deleteProduct(product.id));
          }}
          disabled={isPending}
          danger
        >
          Remove
        </RowButton>
      </div>

      {panel === "pictures" && <ProductImages product={product} />}
      {panel === "options" && <ProductOptions product={product} options={options} />}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </li>
  );
}

function RowButton({
  onClick,
  disabled,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3 py-1.5 font-semibold disabled:opacity-50 ${
        danger
          ? "border-red-200 bg-white text-red-600 hover:border-red-300"
          : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * The pictures, and which one is first.
 *
 * Which one is first is not decoration. It is the storefront card and, more
 * to the point, the image a WhatsApp link preview shows when the member
 * sends the product to somebody. So it gets a button that says so, rather
 * than a drag handle that cannot be used on a phone.
 */
function ProductImages({ product }: { product: ShopProduct }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    const data = new FormData();
    data.append("image", file);
    startTransition(async () => {
      const result = await uploadProductImage(product.id, data);
      if (result.error) setError(result.error);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-xs text-gray-500">
        The first picture is the one buyers see on your shop and in a WhatsApp link. Up to six, 5MB
        each.
      </p>

      {product.image_paths.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {product.image_paths.map((path, i) => (
            <li key={path} className="flex flex-col items-center gap-1">
              <span className="relative size-20 overflow-hidden rounded-lg ring-1 ring-gray-200">
                <Image src={shopImageUrl(path)} alt="" fill sizes="80px" className="object-cover" />
                {i === 0 && (
                  <span className="absolute inset-x-0 bottom-0 bg-black/60 text-center text-[10px] font-semibold text-white">
                    Main
                  </span>
                )}
              </span>
              <span className="flex gap-2 text-[11px]">
                {i !== 0 && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await makeProductImagePrimary(product.id, path);
                        if (result.error) setError(result.error);
                      })
                    }
                    className="font-semibold text-brand hover:underline disabled:opacity-50"
                  >
                    Make main
                  </button>
                )}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await removeProductImage(product.id, path);
                      if (result.error) setError(result.error);
                    })
                  }
                  className="font-semibold text-red-600 hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* One file at a time. A batch of five photos straight off a modern
          phone camera exceeds the Server Action body limit and the whole
          request is rejected before it reaches any of our code, which looks
          to the member like a button that does nothing. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        capture="environment"
        onChange={handleFile}
        disabled={isPending || product.image_paths.length >= 6}
        className="text-xs"
      />
      {isPending && <p className="text-xs text-gray-500">Uploading...</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/**
 * Sizes, colours, editions: one list, one name each.
 *
 * Not a matrix of size against colour. A member who genuinely sells four
 * sizes in three colours can list twelve options, and a member who sells
 * "Small, Medium, Large" is not made to learn what an attribute axis is
 * first. Twelve rows is the worse outcome only in theory: in practice the
 * matrix builder is the thing nobody finishes on a phone.
 */
function ProductOptions({ product, options }: { product: ShopProduct; options: ShopVariantRow[] }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-xs text-gray-500">
        Add options only if buyers have to choose. Leave this empty and the product is bought as it
        is, at its own price.
      </p>

      <ul className="flex flex-col gap-2">
        {options.map((option) =>
          editingId === option.id ? (
            <li key={option.id}>
              <OptionForm
                productId={product.id}
                option={option}
                onDone={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li
              key={option.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2"
            >
              <span>
                <span className="font-medium text-gray-800">{optionLabel(option)}</span>
                <span className="ml-2 text-xs text-gray-500">
                  {option.price_cents == null
                    ? "same price"
                    : `R${(option.price_cents / 100).toFixed(2)}`}
                  {product.track_stock ? ` · ${option.stock_quantity} in stock` : ""}
                </span>
              </span>
              <span className="flex gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setEditingId(option.id)}
                  className="font-semibold text-brand hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await deleteProductOption(product.id, option.id);
                    })
                  }
                  className="font-semibold text-red-600 hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </span>
            </li>
          )
        )}
      </ul>

      {adding ? (
        <OptionForm productId={product.id} option={null} onDone={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="self-start rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-400"
        >
          + Add an option
        </button>
      )}
    </div>
  );
}

function OptionForm({
  productId,
  option,
  onDone,
}: {
  productId: string;
  option: ShopVariantRow | null;
  onDone: () => void;
}) {
  const bound = saveProductOption.bind(null, productId, option?.id ?? null);
  const [state, formAction, pending] = useActionState(bound, null);

  useEffect(() => {
    if (state?.success) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDone intentionally excluded, only state transitions should trigger this
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Name</span>
          <input
            name="label"
            defaultValue={option ? optionLabel(option) : ""}
            placeholder="Large, Blue, 500ml"
            required
            className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Price (R, optional)</span>
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={option?.price_cents == null ? "" : (option.price_cents / 100).toFixed(2)}
            placeholder="Same as product"
            className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Stock</span>
          <input
            name="stockQuantity"
            type="number"
            min="0"
            defaultValue={option?.stock_quantity ?? 0}
            className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          />
        </label>
      </div>
      {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}
      {state?.error?.label && <p className="text-xs text-red-600">{state.error.label[0]}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save option"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ProductForm({ product, onDone }: { product?: ShopProduct; onDone: () => void }) {
  const boundSave = saveProduct.bind(null, product?.id ?? null);
  const [state, formAction, pending] = useActionState(boundSave, null);

  useEffect(() => {
    if (state?.success && !product) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDone/product intentionally excluded, only state transitions should trigger this
  }, [state]);

  // Handoff acceptance criterion 8: a member has to be able to do this
  // unaided, on a phone. Two required fields, and everything a solo seller
  // has never heard of is behind a disclosure rather than in the way.
  const [showExtras, setShowExtras] = useState(false);
  const [tracksStock, setTracksStock] = useState(product?.track_stock ?? false);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-600">What are you selling?</span>
        <input
          name="title"
          defaultValue={product?.title}
          placeholder="Beaded bracelet"
          required
          className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
        />
      </label>

      <label className="flex flex-col gap-1 sm:w-1/2">
        <span className="text-xs font-medium text-gray-600">Price (R)</span>
        <input
          name="basePrice"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          defaultValue={product ? (product.base_price_cents / 100).toFixed(2) : undefined}
          required
          className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-600">Description</span>
        <textarea
          name="description"
          defaultValue={product?.description ?? ""}
          rows={3}
          placeholder="What it is, what it is made of, how big it is. This is what a buyer reads before deciding."
          className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
        />
      </label>

      {/* Off by default, and that is the deliberate choice. A shop that says
          "Out of stock" because the member never updated a number they did
          not know they had turns away real money. */}
      <label className="flex items-start gap-2.5">
        <input
          type="checkbox"
          name="trackStock"
          checked={tracksStock}
          onChange={(e) => setTracksStock(e.target.checked)}
          className="mt-0.5 size-4 shrink-0"
        />
        <span>
          <span className="block text-xs font-medium text-gray-700">I count stock for this product</span>
          <span className="block text-xs text-gray-500">
            Leave this off if you make to order or restock as you go. Buyers are never told it is
            sold out.
          </span>
        </span>
      </label>

      {tracksStock && (
        <label className="flex flex-col gap-1 sm:w-1/3">
          <span className="text-xs font-medium text-gray-600">How many do you have?</span>
          <input
            name="stockQuantity"
            type="number"
            min="0"
            inputMode="numeric"
            defaultValue={product?.stock_quantity ?? 0}
            className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          />
        </label>
      )}

      <button
        type="button"
        onClick={() => setShowExtras((v) => !v)}
        className="self-start text-xs font-semibold text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
      >
        {showExtras ? "Hide" : "Show"} stock code and parcel size
      </button>

      {showExtras && (
        <div className="flex flex-col gap-3 rounded-lg bg-gray-50 p-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Your own stock code (optional)</span>
            <input
              name="sku"
              defaultValue={product?.sku}
              placeholder="Left blank, we make one for you"
              className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
            />
          </label>

          {/* Dewald, 2026-07-30: "we will just need to ensure the member is
              well aware of this part and why it is important." Said here,
              next to the boxes, rather than enforced by making four
              measurements compulsory before somebody can list their first
              product. */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-gray-600">Parcel weight and size</span>
            <p className="text-xs text-gray-500">
              Only needed if you connect a courier account. A courier prices a parcel by how big and
              how heavy it is, so anything left at zero cannot be quoted and your buyer is charged
              your flat delivery instead.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <input name="weightKg" type="number" min="0" step="0.01" defaultValue={product?.weight_kg || ""} placeholder="kg" className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
              <input name="lengthCm" type="number" min="0" defaultValue={product?.length_cm || ""} placeholder="Length cm" className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
              <input name="widthCm" type="number" min="0" defaultValue={product?.width_cm || ""} placeholder="Width cm" className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
              <input name="heightCm" type="number" min="0" defaultValue={product?.height_cm || ""} placeholder="Height cm" className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
            </div>
          </div>
        </div>
      )}

      {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}
      {state?.error?.title && <p className="text-xs text-red-600">{state.error.title[0]}</p>}
      {state?.error?.basePrice && <p className="text-xs text-red-600">{state.error.basePrice[0]}</p>}

      {!product && (
        <p className="text-xs text-gray-500">
          Save it first, then add pictures. Products without a picture sell far less.
        </p>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-full bg-brand px-5 py-2 text-xs font-semibold text-white disabled:opacity-50">
          {pending ? "Saving..." : "Save"}
        </button>
        <button type="button" onClick={onDone} className="rounded-full border border-gray-300 px-5 py-2 text-xs font-semibold text-gray-700">
          Cancel
        </button>
      </div>
    </form>
  );
}

function CouponRow({ coupon }: { coupon: ShopCoupon }) {
  const [isPending, startTransition] = useTransition();
  function handleDelete() {
    if (!confirm(`Remove coupon "${coupon.code}"?`)) return;
    startTransition(async () => {
      await deleteCoupon(coupon.id);
    });
  }
  return (
    <li className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
      <div>
        <p className="font-semibold text-gray-900">{coupon.code}</p>
        <p className="text-xs text-gray-500">
          {coupon.discount_type === "percentage" ? `${coupon.discount_value}% off` : `R${coupon.discount_value} off`} · used {coupon.uses_count}
          {coupon.max_uses ? ` / ${coupon.max_uses}` : ""} times
        </p>
      </div>
      <button type="button" onClick={handleDelete} disabled={isPending} className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50">
        Remove
      </button>
    </li>
  );
}

function CouponForm({ onDone }: { onDone: () => void }) {
  const [state, formAction, pending] = useActionState(saveCoupon, null);

  useEffect(() => {
    if (state?.success) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDone intentionally excluded, only state transitions should trigger this
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm">
      <div className="grid gap-3 sm:grid-cols-3">
        <input name="code" placeholder="Code, e.g. SAVE10" required className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
        <select name="discountType" className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900">
          <option value="percentage">Percentage off</option>
          <option value="fixed_amount">Fixed amount (R) off</option>
        </select>
        <input name="discountValue" type="number" min="1" placeholder="Amount" required className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
      </div>
      <label className="flex flex-col gap-1 sm:w-1/3">
        <span className="text-xs font-medium text-gray-600">Max uses (optional)</span>
        <input name="maxUses" type="number" min="1" className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
      </label>
      {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          {pending ? "Saving..." : "Save coupon"}
        </button>
        <button type="button" onClick={onDone} className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700">
          Cancel
        </button>
      </div>
    </form>
  );
}

function OrderRow({ order }: { order: ShopOrder }) {
  return (
    <li className="flex flex-col gap-1 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">
            {order.customer_name} · R{(order.total_cents / 100).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">
            {order.line_items.map((i) => `${i.quantity}× ${i.title}`).join(", ")}
          </p>
          <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${
              order.payment_status === "oversold" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {order.payment_status}
          </span>
          {order.fulfilment_status === "shipped" ? (
            <span className="font-semibold text-green-700">Shipped</span>
          ) : (
            <span className="text-gray-500">Not shipped</span>
          )}
        </div>
      </div>
    </li>
  );
}
