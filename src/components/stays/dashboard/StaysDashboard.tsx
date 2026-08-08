"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { ArrivalsPanel } from "@/components/stays/dashboard/ArrivalsPanel";
import { BookingsPanel } from "@/components/stays/dashboard/BookingsPanel";
import { RoomTypesPanel } from "@/components/stays/dashboard/RoomTypesPanel";
import { ToursPanel } from "@/components/stays/dashboard/ToursPanel";
import { BlocksPanel } from "@/components/stays/dashboard/BlocksPanel";
import { PropertyPanel } from "@/components/stays/dashboard/PropertyPanel";
import { setStaysEnabled } from "@/app/dashboard/stays/actions";
import type { RoomType, StaysProperty, TourWithSeats } from "@/lib/stays/types";
import type { StayBookingRow, TourBookingRow, BlockRow, WaitlistRow, PhotoOption } from "@/components/stays/dashboard/types";

// The member's whole guesthouse, on one screen, in named sections with one
// open at a time.
//
// Structure, written down before it was built, per the interface standard:
//
//   Coming up        who arrives and who leaves in the next fortnight
//   Bookings         everything, stays and tours together, filterable
//   Rooms and rates  the room types, their prices and their deposits
//   Tours            trips, seats, and the waiting lists
//   Blocked dates    anything sold elsewhere, or a room being painted
//   Your details     amenities, check in times, terms, and the switch
//
// "Coming up" is first and open by default because it is the question a
// guesthouse owner actually opens their phone to ask. Everything that is
// set up once and rarely touched is at the bottom, closed.
//
// Closed sections are hidden rather than unmounted, deliberately: these are
// uncontrolled forms and unmounting a half-filled one to open another would
// throw the typing away.

type SectionKey = "arrivals" | "bookings" | "rooms" | "tours" | "blocks" | "property";

const SECTIONS: { key: SectionKey; title: string; blurb: string }[] = [
  { key: "arrivals", title: "Coming up", blurb: "Who arrives and who leaves in the next two weeks." },
  { key: "bookings", title: "Bookings", blurb: "Everything booked, and what is still owed." },
  { key: "rooms", title: "Rooms and rates", blurb: "Your rooms, what they cost and the deposit you take." },
  { key: "tours", title: "Tours", blurb: "Your trips, their seats, and who is waiting for the next date." },
  { key: "blocks", title: "Blocked dates", blurb: "Nights you do not want anybody to book." },
  { key: "property", title: "Your details", blurb: "What the place has, when guests arrive, and your terms." },
];

export function StaysDashboard({
  clientSlug,
  property,
  roomTypes,
  tours,
  stayBookings,
  tourBookings,
  blocks,
  waitlist,
  photos,
  hasGateway,
  today,
}: {
  clientSlug: string;
  property: StaysProperty;
  roomTypes: RoomType[];
  tours: TourWithSeats[];
  stayBookings: StayBookingRow[];
  tourBookings: TourBookingRow[];
  blocks: BlockRow[];
  waitlist: WaitlistRow[];
  photos: PhotoOption[];
  hasGateway: boolean;
  today: string;
}) {
  const [open, setOpen] = useState<SectionKey>("arrivals");
  const [enabled, setEnabled] = useState(property.enabled);
  const [switching, setSwitching] = useState(false);

  const priced = roomTypes.filter((room) => room.isActive && room.rateCents !== null);

  async function toggle() {
    setSwitching(true);
    const next = !enabled;
    const result = await setStaysEnabled(next);
    if (!result?.error) setEnabled(next);
    setSwitching(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* The one thing that decides whether any of this is visible to a
          guest, at the top, where it cannot be missed. */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div>
          <p className="text-sm font-bold text-ink">
            {enabled ? "Your page is taking bookings" : "Not on your page yet"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {enabled
              ? "Guests can choose dates and book on your page."
              : "Switch this on when your rooms and rates are ready."}
          </p>
          {enabled && clientSlug && (
            <Link
              href={`/${clientSlug}#stay`}
              target="_blank"
              className="mt-2 inline-block text-sm font-semibold text-brand underline-offset-4 hover:underline"
            >
              See it on your page ↗
            </Link>
          )}
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={switching}
          className={`h-11 rounded-full px-6 text-sm font-semibold transition disabled:opacity-60 ${
            enabled
              ? "border border-gray-200 text-gray-600 hover:border-gray-400"
              : "bg-brand text-white shadow-sm hover:bg-brand-dark"
          }`}
        >
          {switching ? "Saving" : enabled ? "Switch off" : "Switch on"}
        </button>
      </section>

      {enabled && priced.length === 0 && (
        // Never a blank box. An empty state says what will appear and what
        // to do to make it appear.
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Nothing can be booked yet. Add a room in <strong>Rooms and rates</strong> and give it a price per night,
          and it will start showing up when guests search your dates.
        </p>
      )}

      {!hasGateway && (
        <p className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          You are not set up to take payment online yet, so bookings come through as requests and you arrange
          payment yourself. Connect your own Paystack or Bob Pay under{" "}
          <Link href="/dashboard?tab=booking-shop" className="font-semibold text-brand underline-offset-4 hover:underline">
            Selling
          </Link>{" "}
          to take a deposit at the moment somebody books. The money goes straight into your own account either way.
        </p>
      )}

      {SECTIONS.map((section) => (
        <Section
          key={section.key}
          title={section.title}
          blurb={section.blurb}
          isOpen={open === section.key}
          onToggle={() => setOpen(section.key)}
        >
          {section.key === "arrivals" && (
            <ArrivalsPanel stayBookings={stayBookings} tourBookings={tourBookings} today={today} />
          )}
          {section.key === "bookings" && (
            <BookingsPanel stayBookings={stayBookings} tourBookings={tourBookings} clientSlug={clientSlug} today={today} />
          )}
          {section.key === "rooms" && (
            <RoomTypesPanel roomTypes={roomTypes} photos={photos} hasGateway={hasGateway} />
          )}
          {section.key === "tours" && (
            <ToursPanel tours={tours} waitlist={waitlist} photos={photos} clientSlug={clientSlug} today={today} />
          )}
          {section.key === "blocks" && (
            <BlocksPanel blocks={blocks} roomTypes={roomTypes} today={today} />
          )}
          {section.key === "property" && <PropertyPanel property={property} />}
        </Section>
      ))}
    </div>
  );
}

function Section({
  title,
  blurb,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  blurb: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
      >
        <span>
          <span className="block text-base font-bold text-ink">{title}</span>
          <span className="mt-0.5 block text-sm text-gray-500">{blurb}</span>
        </span>
        <ChevronDown
          aria-hidden
          className={`h-5 w-5 shrink-0 text-gray-400 transition ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <div className={isOpen ? "border-t border-gray-100 p-5" : "hidden"}>{children}</div>
    </section>
  );
}
