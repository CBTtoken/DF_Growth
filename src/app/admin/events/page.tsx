import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { EVENT_TYPES } from "@/lib/event-types";
import { publishEvent, dismissEventFlag, removeEvent } from "@/app/admin/events/actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type QueueEvent = {
  id: string;
  event_name: string;
  city: string;
  event_type: string;
  status: string;
  flagged_by: "public" | "system" | null;
  flagged_reason: string | null;
  flagged_at: string | null;
  created_at: string;
  contact_details: { email: string } | null;
};

// List Your Event Sec 6: "every flagged event, whether flagged by a
// visitor or by the system, lands here for a human decision." Two
// distinct queues, not one list — a pending_review event has never gone
// live at all (needs "publish" or "remove"), while a flagged event is
// already published and just needs its flag resolved ("dismiss" or
// "remove"). Conflating them would make the wrong action available on the
// wrong row.
export default async function AdminEventsPage() {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) forbidden();

  const admin = createAdminClient();
  const { data: events } = await admin
    .from("events")
    .select("id, event_name, city, event_type, status, flagged_by, flagged_reason, flagged_at, created_at, contact_details")
    .or("status.eq.pending_review,flagged_by.not.is.null")
    .order("created_at", { ascending: true });

  const list = (events ?? []) as unknown as QueueEvent[];
  const pendingReview = list.filter((e) => e.status === "pending_review");
  const flagged = list.filter((e) => e.status !== "pending_review" && e.flagged_by);
  const typeLabel = (value: string) => EVENT_TYPES.find((t) => t.value === value)?.label ?? value;

  return (
    <main className="min-h-full bg-gray-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <BrandHeader />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm font-semibold text-gray-500 hover:text-gray-700">
              ← Admin
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-ink">Events queue</h1>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
            {list.length} pending
          </span>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Pending review ({pendingReview.length})
          </h2>
          {pendingReview.map((e) => (
            <div key={e.id} className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{e.event_name}</p>
                  <p className="text-sm text-gray-500">
                    {typeLabel(e.event_type)} · {e.city} · {e.contact_details?.email ?? "no email on file"}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold uppercase text-amber-700">
                  Never published
                </span>
              </div>
              {e.flagged_reason && (
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-ink">Reason: </span>
                  {e.flagged_reason}
                </p>
              )}
              <p className="text-xs text-gray-400">Submitted {new Date(e.created_at).toLocaleString()}</p>
              <div className="flex flex-wrap gap-3">
                <form action={publishEvent.bind(null, e.id)}>
                  <button
                    type="submit"
                    className="rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-dark"
                  >
                    Publish
                  </button>
                </form>
                <form action={removeEvent.bind(null, e.id)}>
                  <button
                    type="submit"
                    className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    Remove
                  </button>
                </form>
              </div>
            </div>
          ))}
          {pendingReview.length === 0 && (
            <p className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-400 shadow-sm">
              Nothing waiting on a first review.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Flagged ({flagged.length})</h2>
          {flagged.map((e) => (
            <div key={e.id} className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{e.event_name}</p>
                  <p className="text-sm text-gray-500">
                    {typeLabel(e.event_type)} · {e.city} · {e.contact_details?.email ?? "no email on file"}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold uppercase text-amber-700">
                  Flagged by {e.flagged_by}
                </span>
              </div>
              {e.flagged_reason && (
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-ink">Reason: </span>
                  {e.flagged_reason}
                </p>
              )}
              <p className="text-xs text-gray-400">
                {e.flagged_at && `Flagged ${new Date(e.flagged_at).toLocaleString()}`}
              </p>
              <div className="flex flex-wrap gap-3">
                <form action={dismissEventFlag.bind(null, e.id)}>
                  <button
                    type="submit"
                    className="rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:border-gray-400"
                  >
                    Keep / dismiss flag
                  </button>
                </form>
                <form action={removeEvent.bind(null, e.id)}>
                  <button
                    type="submit"
                    className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    Remove
                  </button>
                </form>
              </div>
            </div>
          ))}
          {flagged.length === 0 && (
            <p className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-400 shadow-sm">
              Nothing flagged right now.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
