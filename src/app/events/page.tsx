import Link from "next/link";
import type { Metadata } from "next";
import { Search, CalendarPlus, CalendarDays, MapPin, ArrowRight } from "lucide-react";
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

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-blue via-brand-blue-mid to-brand-blue-dark">
        {/* dot texture + glow depth */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{ backgroundImage: "radial-gradient(circle, white 1.5px, transparent 1.5px)", backgroundSize: "26px 26px" }}
          aria-hidden
        />
        <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-28 left-10 size-80 rounded-full bg-accent/20 blur-3xl" aria-hidden />

        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-14 sm:px-6 lg:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="text-white">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                Community events near you
              </span>
              <h1 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
                Find <span className="text-amber-300">markets, workshops</span> and community events near you
              </h1>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-white/80">
                Real events shared by real South African organisers. Free to browse, and always free to list your own.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/events/new"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-accent-hover"
                >
                  <CalendarPlus size={16} /> List your event, free
                </Link>
                <a
                  href="#events"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  Browse events <ArrowRight size={16} />
                </a>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-white/70">
                {["Free to list, always", "Free to browse", "Real local organisers"].map((p) => (
                  <span key={p} className="inline-flex items-center gap-1.5">
                    <span className="grid size-4 place-items-center rounded-full bg-emerald-400/20 text-emerald-300">✓</span>
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* Floating preview cards (decorative, shows what a listing looks like) */}
            <div className="relative mx-auto hidden h-[340px] w-full max-w-sm lg:block" aria-hidden>
              <div className="absolute right-2 top-12 w-56 -rotate-6 rounded-2xl border border-white/20 bg-white/95 shadow-xl">
                <div className="h-20 rounded-t-2xl bg-gradient-to-br from-brand-blue-mid to-brand-blue-dark" />
                <div className="space-y-2 p-3">
                  <div className="h-2 w-3/4 rounded bg-neutral-border" />
                  <div className="h-2 w-1/2 rounded bg-neutral-border" />
                </div>
              </div>
              <div className="absolute left-2 top-0 w-64 rotate-3 rounded-2xl border border-white/20 bg-white shadow-2xl">
                <div className="relative h-28 rounded-t-2xl bg-gradient-to-br from-brand-blue to-brand-blue-dark">
                  <div className="absolute left-3 top-3 min-w-[46px] overflow-hidden rounded-lg bg-white text-center shadow">
                    <div className="bg-brand-blue px-2 pt-1 text-[10px] font-bold uppercase text-white">Oct</div>
                    <div className="px-2 py-0.5 text-lg font-extrabold leading-none text-neutral-ink">12</div>
                  </div>
                  <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">Free</span>
                </div>
                <div className="p-3">
                  <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-blue">
                    Market
                  </span>
                  <p className="mt-1.5 text-sm font-bold text-neutral-ink">Saturday Craft Market</p>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-neutral-muted">
                    <CalendarDays size={11} /> Sat, 12 Oct
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-neutral-muted">
                    <MapPin size={11} /> Johannesburg
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Elevated search bar floating over the hero */}
          <form
            method="GET"
            className="relative z-10 mt-10 flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-2xl shadow-black/20 sm:mt-12 md:flex-row md:items-center md:p-2.5"
          >
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-muted" />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search events"
                className="w-full rounded-xl border border-neutral-border bg-white py-2.5 pl-10 pr-4 text-sm text-neutral-ink placeholder:text-neutral-muted outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 md:border-transparent md:focus:border-brand-blue"
              />
            </div>
            <select name="city" defaultValue={city} className={`${selectClass} md:w-40`} aria-label="City">
              <option value="">All cities</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select name="type" defaultValue={type} className={`${selectClass} md:w-44`} aria-label="Event type">
              <option value="">All event types</option>
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-accent-hover md:px-7"
            >
              <Search size={16} /> Search
            </button>
          </form>
        </div>
      </section>

      {/* Results */}
      <section id="events" className="mx-auto w-full max-w-6xl flex-1 scroll-mt-8 px-4 py-10 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-neutral-ink">
            {list.length > 0 ? `${list.length} upcoming ${list.length === 1 ? "event" : "events"}` : ""}
            {hasFilters ? (
              <Link href="/events" className="ml-3 font-medium text-neutral-muted hover:text-brand-blue">
                Clear filters
              </Link>
            ) : null}
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
