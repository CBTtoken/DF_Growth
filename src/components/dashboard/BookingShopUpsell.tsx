import { CalendarDays, ShoppingBag } from "lucide-react";

// Dewald's ask, 2026-07-18: Foundation clients should still see that
// Booking & Shop exist (not a hidden tab) but land on a locked upsell
// instead of the real BookingSection/ShopSection UI, matching the
// existing "see the whole platform, unlock as you grow" pattern already
// used by PlatformFeatures.tsx for Enterprise-only features.
export function BookingShopUpsell({ growthClientId }: { growthClientId: string }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink">Booking & Shop</h2>
        <p className="mt-1 text-sm text-gray-500">Available on Growth — not part of your Foundation plan yet.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-5">
          <span className="grid size-10 place-items-center rounded-lg bg-brand/10 text-brand">
            <CalendarDays className="size-5" aria-hidden />
          </span>
          <h3 className="text-sm font-bold text-ink">Booking</h3>
          <p className="text-sm text-gray-500">
            A real appointment, rental, or slot calendar on your page. Visitors book directly, no
            double-bookings.
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-5">
          <span className="grid size-10 place-items-center rounded-lg bg-brand/10 text-brand">
            <ShoppingBag className="size-5" aria-hidden />
          </span>
          <h3 className="text-sm font-bold text-ink">Shop</h3>
          <p className="text-sm text-gray-500">
            A product catalog and cart on your page, with real stock tracking so you never oversell.
          </p>
        </div>
      </div>
      <a
        href={`/api/plan/upgrade?client=${growthClientId}&interval=monthly`}
        className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark"
      >
        Upgrade To Growth
      </a>
    </section>
  );
}
