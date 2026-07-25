import Link from "next/link";
import type { Metadata } from "next";
import { Search, CalendarPlus } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EventCard } from "@/components/events/EventCard";
import { CITIES } from "@/lib/cities";
import { EVENT_TYPES } from "@/lib/event-types";

export const metadata: Metadata = {
  title: "Events",
  description: "Free community events near you. Markets, workshops, fundraisers, and more, shared by real organisers.",
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

// Redesigned 2026-07-25 from a Bolt design to match the Marketplace/home look
// (light hero, EventCard grid). The data logic below is unchanged: free
// community events, no ticketing, sorted soonest first, past events drop out
// of the public browse once their date passes. Reads searchParams, so dynamic
// per request (server-side filtering), same as /marketplace.
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
    // A multi-day event stays visible until it actually ends; a
    // single-datetime event drops out once its start_datetime passes.
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
  const hasFilters = Boolean(q || city || type);

  const selectClass =
    "w-full rounded-lg border border-neutral-border bg-white px-3.5 py-2.5 text-sm text-neutral-ink outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";

  return (
    <main className="flex flex-1 flex-col bg-neutral-light">
      <MarketingHeader />

      {/* Hero + search */}
      <section className="bg-gradient-to-br from-brand-blue-light via-white to-white px-4 pb-10 pt-12 sm:px-6 lg:pb-14 lg:pt-16">
        <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-blue/20 bg-brand-blue-light px-3 py-1 text-xs font-semibold text-brand-blue">
              <span className="size-1.5 rounded-full bg-brand-blue" />
              Community events
            </span>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-neutral-ink sm:text-4xl lg:text-5xl">
              Find <span className="text-brand-blue">free events</span> near you
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-mid sm:text-base">
              Markets, workshops, fundraisers, and more, happening near you. Free to browse, and always free to list
              your own.
            </p>
            <Link
              href="/events/new"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold text-white shadow-md shadow-accent/25 transition hover:-translate-y-0.5 hover:bg-accent-hover"
            >
              <CalendarPlus size={16} /> List your event, free
            </Link>
          </div>

          <form method="GET" className="flex flex-col gap-3 rounded-2xl border border-neutral-border bg-white p-4 shadow-card sm:p-5">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-muted" />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search events"
                className="w-full rounded-lg border border-neutral-border bg-white py-2.5 pl-10 pr-4 text-sm text-neutral-ink placeholder:text-neutral-muted outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select name="city" defaultValue={city} className={selectClass} aria-label="City">
                <option value="">All cities</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select name="type" defaultValue={type} className={selectClass} aria-label="Event type">
                <option value="">All event types</option>
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col items-center gap-2 pt-1">
              <button
                type="submit"
                className="inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-brand-blue px-8 py-3 text-base font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-blue-dark"
              >
                <Search size={18} /> Search
              </button>
              {hasFilters && (
                <Link href="/events" className="text-xs font-semibold text-neutral-muted hover:text-brand-blue">
                  Clear filters
                </Link>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* Results */}
      <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-neutral-ink">
            {list.length > 0 ? `${list.length} upcoming ${list.length === 1 ? "event" : "events"}` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-blue/30 bg-white px-4 py-2 text-xs font-semibold text-brand-blue shadow-sm transition hover:bg-brand-blue hover:text-white"
            >
              Find businesses
            </Link>
            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-blue/30 bg-white px-4 py-2 text-xs font-semibold text-brand-blue shadow-sm transition hover:bg-brand-blue hover:text-white"
            >
              Find local products
            </Link>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-neutral-border bg-white p-16 text-center">
            <p className="text-base font-semibold text-neutral-ink">No upcoming events match yet</p>
            <p className="max-w-sm text-sm text-neutral-muted">
              {hasFilters ? "Try a different search or clear your filters." : "Be the first to list one, it is free."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((event) => (
              <EventCard
                key={event.id}
                id={event.id}
                name={event.event_name}
                description={event.description}
                startIso={event.start_datetime}
                city={event.city}
                typeLabel={typeLabel(event.event_type)}
                imageUrl={event.images?.[0] ? `${photosBase}/${event.images[0]}` : null}
              />
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
