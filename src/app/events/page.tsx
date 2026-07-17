import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, MapPin } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CITIES } from "@/lib/cities";
import { EVENT_TYPES } from "@/lib/event-types";

export const metadata: Metadata = {
  title: "Events",
  description: "Free events happening near you — markets, workshops, fundraisers, and more, listed by real organisers.",
};

type EventRow = {
  id: string;
  event_name: string;
  description: string | null;
  start_datetime: string;
  end_datetime: string | null;
  city: string;
  event_type: string;
  images: string[] | null;
};

function formatEventDate(startIso: string) {
  const d = new Date(startIso);
  return d.toLocaleString("en-ZA", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// List Your Event Sec 4: "structurally similar to the Marketplace
// directory: search box, city filter, event type filter... sorted soonest
// first by default... past events automatically drop out of the public
// browse view once their date passes, kept in the database, not deleted."
// Reads searchParams (dynamic by definition, same as /marketplace) — the
// whole point is server-side filtering per request, no force-static here.
export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string; type?: string }>;
}) {
  const { q = "", city = "", type = "" } = await searchParams;
  const admin = createAdminClient();

  const nowIso = new Date().toISOString();

  let query = admin
    .from("events")
    .select("id, event_name, description, start_datetime, end_datetime, city, event_type, images")
    .eq("status", "published")
    // A multi-day event stays visible until it actually ends, not just
    // until it starts — end_datetime is optional (Sec 3: "end optional"),
    // so a single-datetime event instead drops out the moment its own
    // start_datetime passes.
    .or(`end_datetime.gte.${nowIso},and(end_datetime.is.null,start_datetime.gte.${nowIso})`)
    .order("start_datetime", { ascending: true })
    .limit(60);

  if (city) query = query.eq("city", city);
  if (type) query = query.eq("event_type", type);
  if (q.trim()) {
    const term = q.trim().replace(/[%,]/g, "");
    query = query.or(`event_name.ilike.%${term}%,description.ilike.%${term}%`);
  }

  const { data: events } = await query;
  const list = (events ?? []) as EventRow[];

  const photosBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-photos`;
  const typeLabel = (value: string) => EVENT_TYPES.find((t) => t.value === value)?.label ?? value;

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <MarketingHeader />

      <section className="border-b border-gray-100 bg-white px-4 py-14 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
          <span className="font-badge text-xs uppercase tracking-widest text-brand">Events</span>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">What&apos;s happening near you</h1>
          <p className="max-w-xl text-sm text-gray-500 sm:text-base">
            Markets, workshops, fundraisers, and more — free to list, free to browse.
          </p>
          <Link
            href="/events/new"
            className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark"
          >
            + List your event
          </Link>

          <form method="GET" className="mt-4 flex w-full max-w-xl flex-col gap-3">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search events"
              className="w-full rounded-full border border-gray-200 bg-white px-5 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                name="city"
                defaultValue={city}
                className="w-full rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                <option value="">All cities</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                name="type"
                defaultValue={type}
                className="w-full rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                <option value="">All event types</option>
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 sm:w-auto sm:self-center"
            >
              Search
            </button>
          </form>

          {(q || city || type) && (
            <Link href="/events" className="text-xs font-medium text-gray-400 hover:text-brand">
              Clear filters
            </Link>
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-white p-16 text-center">
            <p className="text-base font-semibold text-ink">No upcoming events match yet</p>
            <p className="max-w-sm text-sm text-gray-500">
              {q || city || type ? "Try a different search or clear your filters." : "Be the first to list one — it's free."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((event) => {
              const thumbnailUrl = event.images?.[0] ? `${photosBase}/${event.images[0]}` : null;

              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {thumbnailUrl ? (
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                      <Image
                        src={thumbnailUrl}
                        alt={event.event_name}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition duration-300 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="grid aspect-[4/3] w-full place-items-center bg-brand/5 text-4xl" aria-hidden>
                      📅
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5 p-4">
                    <span className="w-fit rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold uppercase text-brand">
                      {typeLabel(event.event_type)}
                    </span>
                    <h2 className="truncate text-sm font-bold tracking-tight text-ink group-hover:text-brand">
                      {event.event_name}
                    </h2>
                    <div className="flex flex-col gap-0.5 text-xs text-gray-400">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-3.5 flex-shrink-0" aria-hidden />
                        {formatEventDate(event.start_datetime)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-3.5 flex-shrink-0" aria-hidden />
                        {event.city}
                      </span>
                    </div>
                    {event.description && <p className="line-clamp-2 text-sm text-gray-500">{event.description}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
