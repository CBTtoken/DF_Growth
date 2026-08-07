import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { BuildOrderRow } from "@/components/admin/BuildOrderRow";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Sprint "Onboarding two doors" item 1: the build queue, with the
// three-working-day clock visible, which is the whole point of it.
//
// Structure: one list, most urgent first, because that is the only order
// that matters when a promise has been made with money attached. Awaiting
// payment sits in its own group underneath, since those are prospects to
// follow up rather than work to do.
export default async function AdminBuildQueuePage() {
  const gate = await requireAdminEmail();
  if ("error" in gate) forbidden();

  const admin = createAdminClient();

  const { data: open } = await admin
    .from("growth_clients")
    .select(
      "id, business_name, slug, contact_email, call_phone, whatsapp_phone, industry, business_address, plan, billing_cycle, build_order_status, build_order_paid_at, build_order_due_at, build_order_brief, build_order_amount_cents"
    )
    .in("build_order_status", ["paid", "in_progress"])
    .order("build_order_due_at", { ascending: true });

  const { data: awaiting } = await admin
    .from("growth_clients")
    .select("id, business_name, contact_email, created_at")
    .eq("build_order_status", "awaiting_payment")
    .order("created_at", { ascending: false })
    .limit(25);

  const { data: delivered } = await admin
    .from("growth_clients")
    .select("id, business_name, slug, build_order_due_at")
    .eq("build_order_status", "delivered")
    .order("build_order_due_at", { ascending: false })
    .limit(10);

  const openOrders = open ?? [];

  return (
    <main className="flex flex-1 flex-col items-center gap-8 bg-gray-50 px-4 py-10">
      <BrandHeader />

      <div className="flex w-full max-w-4xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Build queue</h1>
          <p className="mt-1 text-sm text-gray-500">
            Paid done-for-you builds, soonest promise first. The Build Kit is the manual for each
            one.
          </p>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">
            To build ({openOrders.length})
          </h2>
          {openOrders.length === 0 ? (
            <p className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-400 shadow-sm">
              Nothing in the queue. Paid build orders land here with a three working day clock.
            </p>
          ) : (
            openOrders.map((order) => <BuildOrderRow key={order.id} order={order} />)
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">
            Started but never paid ({awaiting?.length ?? 0})
          </h2>
          <p className="text-xs text-gray-500">
            These filled in the build form and did not finish at the card screen. Their details are
            saved, so a nudge is worth it.
          </p>
          {(awaiting ?? []).length === 0 ? (
            <p className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-400 shadow-sm">
              Nobody has dropped off at payment.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {(awaiting ?? []).map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm shadow-sm"
                >
                  <span className="font-semibold text-ink">{row.business_name}</span>
                  <span className="text-gray-500">{row.contact_email}</span>
                  <Link
                    href={`/admin/clients/${row.id}`}
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {(delivered ?? []).length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">
              Recently delivered
            </h2>
            <ul className="flex flex-wrap gap-2">
              {(delivered ?? []).map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/${row.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-gray-300"
                  >
                    {row.business_name} ↗
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
