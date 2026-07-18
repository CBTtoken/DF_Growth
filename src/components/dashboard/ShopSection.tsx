"use client";

import { useState, useTransition, useActionState, useRef, useEffect } from "react";
import Papa from "papaparse";
import {
  setShopEnabled,
  saveCollectionAddress,
  saveProduct,
  deleteProduct,
  toggleProductActive,
  bulkUploadProducts,
  saveCoupon,
  deleteCoupon,
  markOrderFulfilled,
  type CsvRowError,
} from "@/app/dashboard/shop-actions";
import { SHOP_CSV_COLUMNS } from "@/lib/schemas/shop";

export type ShopProduct = {
  id: string;
  title: string;
  sku: string;
  description: string | null;
  base_price_cents: number;
  weight_kg: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  status: "draft" | "active" | "archived";
  stock_quantity: number;
};

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
  products,
  coupons,
  orders,
  collectionAddress,
}: {
  shopEnabled: boolean;
  products: ShopProduct[];
  coupons: ShopCoupon[];
  orders: ShopOrder[];
  collectionAddress: ShopCollectionAddress;
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
    <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-ink">Shop</h2>
          <p className="mt-1 text-sm text-gray-500">Sell products directly from your page.</p>
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
          <CollectionAddressForm address={collectionAddress} />

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-gray-800">Inventory</h3>
            <CsvUpload />
            {products.length === 0 && <p className="text-sm text-gray-400">No products yet — upload a CSV or add one below.</p>}
            <ul className="flex flex-col gap-2">
              {products.map((p) => (
                <ProductRow key={p.id} product={p} />
              ))}
            </ul>
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

          <div className="flex flex-col gap-3 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-800">Orders</h3>
            {orders.length === 0 ? (
              <p className="text-sm text-gray-400">No orders yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {orders.map((o) => (
                  <OrderRow key={o.id} order={o} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function CollectionAddressForm({ address }: { address: ShopCollectionAddress }) {
  const [state, formAction, pending] = useActionState(saveCollectionAddress, null);
  return (
    <form action={formAction} className="flex flex-col gap-3 border-b border-gray-100 pb-5 text-sm">
      <h3 className="text-sm font-semibold text-gray-800">Collection address</h3>
      <p className="text-xs text-gray-500">Where couriers pick up orders from — required for shipping.</p>
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

function ProductRow({ product }: { product: ShopProduct }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirm(`Remove "${product.title}"?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteProduct(product.id);
      if (result.error) setError(result.error);
    });
  }

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      const result = await toggleProductActive(product.id, product.status !== "active");
      if (result.error) setError(result.error);
    });
  }

  if (editing) return <ProductForm product={product} onDone={() => setEditing(false)} />;

  return (
    <li className="flex flex-col gap-1 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">
            {product.title} <span className="text-xs font-normal text-gray-400">({product.sku})</span>{" "}
            {product.status !== "active" && (
              <span className="ml-1 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600">Hidden</span>
            )}
          </p>
          <p className="text-xs text-gray-500">
            R{(product.base_price_cents / 100).toFixed(2)} · {product.stock_quantity} in stock
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <button type="button" onClick={() => setEditing(true)} className="font-semibold text-brand hover:underline">
            Edit
          </button>
          <button type="button" onClick={handleToggle} disabled={isPending} className="font-semibold text-gray-600 hover:underline disabled:opacity-50">
            {product.status === "active" ? "Hide" : "Show"}
          </button>
          <button type="button" onClick={handleDelete} disabled={isPending} className="font-semibold text-red-600 hover:underline disabled:opacity-50">
            Remove
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </li>
  );
}

function ProductForm({ product, onDone }: { product?: ShopProduct; onDone: () => void }) {
  const boundSave = saveProduct.bind(null, product?.id ?? null);
  const [state, formAction, pending] = useActionState(boundSave, null);

  useEffect(() => {
    if (state?.success && !product) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDone/product intentionally excluded, only state transitions should trigger this
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Title</span>
          <input name="title" defaultValue={product?.title} required className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">SKU</span>
          <input name="sku" defaultValue={product?.sku} required className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Price (R)</span>
          <input
            name="basePrice"
            type="number"
            min="0"
            step="0.01"
            defaultValue={product ? (product.base_price_cents / 100).toFixed(2) : undefined}
            required
            className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Stock quantity</span>
          <input
            name="stockQuantity"
            type="number"
            min="0"
            defaultValue={product?.stock_quantity ?? 0}
            className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          />
        </label>
      </div>

      <p className="text-xs font-medium text-gray-600">Package weight &amp; dimensions (for courier rates)</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <input name="weightKg" type="number" min="0.01" step="0.01" defaultValue={product?.weight_kg} placeholder="kg" required className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
        <input name="lengthCm" type="number" min="1" defaultValue={product?.length_cm} placeholder="Length cm" required className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
        <input name="widthCm" type="number" min="1" defaultValue={product?.width_cm} placeholder="Width cm" required className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
        <input name="heightCm" type="number" min="1" defaultValue={product?.height_cm} placeholder="Height cm" required className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-600">Description (optional)</span>
        <textarea name="description" defaultValue={product?.description ?? ""} rows={2} className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
      </label>

      {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          {pending ? "Saving..." : "Save"}
        </button>
        <button type="button" onClick={onDone} className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700">
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
  const [isPending, startTransition] = useTransition();
  return (
    <li className="flex flex-col gap-1 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">
            {order.customer_name} — R{(order.total_cents / 100).toFixed(2)}
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
            <button
              type="button"
              onClick={() =>
                startTransition(async () => {
                  await markOrderFulfilled(order.id);
                })
              }
              disabled={isPending}
              className="rounded-full bg-brand px-2.5 py-0.5 font-semibold text-white disabled:opacity-50"
            >
              Mark shipped
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
