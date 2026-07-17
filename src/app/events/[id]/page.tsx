import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EventSchema } from "@/components/events/EventSchema";
import { EVENT_TYPES } from "@/lib/event-types";

type EventDetail = {
  id: string;
  event_name: string;
  description: string | null;
  start_datetime: string;
  end_datetime: string | null;
  location_address: string | null;
  city: string;
  event_type: string;
  social_links: { facebook: string | null; instagram: string | null; website: string | null } | null;
  contact_details: { name: string | null; email: string; phone: string | null; whatsapp: string | null } | null;
  images: string[] | null;
  ticket_info_text: string | null;
  booking_url: string | null;
};

async function getEvent(id: string): Promise<EventDetail | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("events")
    .select(
      "id, event_name, description, start_datetime, end_datetime, location_address, city, event_type, social_links, contact_details, images, ticket_info_text, booking_url"
    )
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  return data as EventDetail | null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return {};

  const title = `${event.event_name} · ${event.city}`;
  const description = event.description?.slice(0, 160) || `${event.event_name} in ${event.city} — DigitalFlyer Events.`;
  const image = event.images?.[0]
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-photos/${event.images[0]}`
    : "/brand/logo-blue.png";
  const url = `/events/${id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

function formatDateRange(startIso: string, endIso: string | null) {
  const start = new Date(startIso);
  const startLabel = start.toLocaleString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!endIso) return startLabel;

  const end = new Date(endIso);
  const sameDay = start.toDateString() === end.toDateString();
  const endLabel = sameDay
    ? end.toLocaleString("en-ZA", { hour: "2-digit", minute: "2-digit" })
    : end.toLocaleString("en-ZA", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  return `${startLabel} – ${endLabel}`;
}

// List Your Event Sec 4: "each event gets its own dedicated, shareable
// page, not just a card in a list." Sec 6's "report this event" flag is
// explicitly Sprint 2 scope (the admin moderation queue it routes to
// doesn't exist yet) — deliberately not added here as a dead button that
// goes nowhere.
export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return notFound();

  const photosBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-photos`;
  const images = event.images ?? [];
  const heroUrl = images[0] ? `${photosBase}/${images[0]}` : null;
  const typeLabel = EVENT_TYPES.find((t) => t.value === event.event_type)?.label ?? event.event_type;
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/events/${id}`;

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <EventSchema
        eventName={event.event_name}
        description={event.description}
        startDatetime={event.start_datetime}
        endDatetime={event.end_datetime}
        locationAddress={event.location_address}
        city={event.city}
        url={url}
        imageUrl={heroUrl}
      />
      <MarketingHeader />

      {/* Real UAT feedback: stretching an arbitrary uploaded photo into a
          full-width cropped banner looked broken for anything that wasn't a
          wide landscape photo (a promotional graphic got mangled). A safe
          text-only header for now — event name and location, no image
          crop gamble — any uploaded photos live in the gallery below
          instead. A proper banner treatment (smart cropping, a dedicated
          banner upload) is a real follow-up, not solved here. */}
      <div className="bg-ink px-4 py-10 text-center text-white sm:px-6 sm:py-14">
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide">
          {typeLabel}
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{event.event_name}</h1>
        <p className="mt-2 text-sm text-white/70">
          {event.location_address ? `${event.location_address}, ${event.city}` : event.city}
        </p>
      </div>

      <section className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm font-medium text-gray-700">{formatDateRange(event.start_datetime, event.end_datetime)}</p>

          {event.description && (
            <p className="whitespace-pre-wrap text-base leading-relaxed text-gray-600">{event.description}</p>
          )}

          {(event.ticket_info_text || event.booking_url) && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
              {event.ticket_info_text && (
                <span>
                  <span className="font-semibold text-ink">Tickets: </span>
                  {event.ticket_info_text}
                </span>
              )}
              {event.booking_url && (
                <a
                  href={event.booking_url}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-dark"
                >
                  Book now ↗
                </a>
              )}
            </div>
          )}

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {images.map((path) => (
                <div key={path} className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                  <Image src={`${photosBase}/${path}`} alt="" fill sizes="20vw" className="object-cover" />
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-gray-100 pt-6">
            <h2 className="text-sm font-semibold text-gray-700">Contact the organiser</h2>
            {event.contact_details?.name && <p className="text-sm text-gray-700">{event.contact_details.name}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {event.contact_details?.email && (
                <a href={`mailto:${event.contact_details.email}`} className="text-brand underline-offset-2 hover:underline">
                  {event.contact_details.email}
                </a>
              )}
              {event.contact_details?.phone && (
                <a
                  href={`tel:${event.contact_details.phone.replace(/\s+/g, "")}`}
                  className="text-brand underline-offset-2 hover:underline"
                >
                  {event.contact_details.phone}
                </a>
              )}
              {event.contact_details?.whatsapp && (
                <a
                  href={`https://wa.me/${event.contact_details.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand underline-offset-2 hover:underline"
                >
                  WhatsApp
                </a>
              )}
            </div>
            {(event.social_links?.facebook || event.social_links?.instagram || event.social_links?.website) && (
              <div className="flex flex-wrap gap-4 text-sm">
                {event.social_links?.facebook && (
                  <a href={event.social_links.facebook} target="_blank" rel="noreferrer" className="text-brand underline-offset-2 hover:underline">
                    Facebook
                  </a>
                )}
                {event.social_links?.instagram && (
                  <a href={event.social_links.instagram} target="_blank" rel="noreferrer" className="text-brand underline-offset-2 hover:underline">
                    Instagram
                  </a>
                )}
                {event.social_links?.website && (
                  <a href={event.social_links.website} target="_blank" rel="noreferrer" className="text-brand underline-offset-2 hover:underline">
                    Website
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/events" className="text-sm font-semibold text-gray-500 hover:text-brand">
            ← Back to all events
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
