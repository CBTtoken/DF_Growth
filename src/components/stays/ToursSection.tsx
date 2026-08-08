import Image from "next/image";
import Link from "next/link";
import { TOUR_COPY } from "@/lib/stays/copy";
import { longDate, rand } from "@/lib/stays/money";
import type { TourWithSeats } from "@/lib/stays/types";

/**
 * "Explore with us", the second section, and deliberately the smaller one.
 *
 * Handoff Job 6: tours appear on the member's page as a compact row of
 * cards, not full descriptions. The detail lives on the tour's own page,
 * which is the thing Google finds and the thing the member shares in a
 * WhatsApp message.
 *
 * These reuse the Events module's card shape and none of its tables,
 * routes or rules. That separation is the whole point: Events is free,
 * public and open to submission by non-members, and putting a paid tour
 * with seats and money attached onto a surface anyone can post to would be
 * a serious mistake that nobody would notice until it happened.
 */
export function ToursSection({
  clientSlug,
  tours,
  accentColor,
}: {
  clientSlug: string;
  tours: TourWithSeats[];
  accentColor: string;
  photoUrls?: Map<string, string>;
}) {
  if (tours.length === 0) return null;

  return (
    <section id="tours" className="scroll-mt-20 bg-gray-50 px-4 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          {TOUR_COPY.sectionTitle}
        </h2>
        <p className="mt-2 text-base text-gray-600">{TOUR_COPY.sectionLead}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tours.map((tour) => (
            <TourCard key={tour.id} clientSlug={clientSlug} tour={tour} accentColor={accentColor} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function TourCard({
  clientSlug,
  tour,
  accentColor,
  imageUrl,
}: {
  clientSlug: string;
  tour: TourWithSeats;
  accentColor: string;
  imageUrl?: string | null;
}) {
  const full = tour.seatsLeft <= 0;

  return (
    <Link
      href={`/${clientSlug}/tours/${tour.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-16/10 bg-gray-100">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={tour.title}
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: accentColor }}>
          {longDate(tour.departureDate)}
        </p>
        <h3 className="text-base font-bold leading-snug text-gray-900">{tour.title}</h3>
        {tour.summary && <p className="line-clamp-2 text-sm text-gray-600">{tour.summary}</p>}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-sm font-bold text-gray-900">
            {rand(tour.priceCents)}{" "}
            <span className="font-normal text-gray-500">{TOUR_COPY.perPerson}</span>
          </span>
          {/* A real number or a real "full". Never a made up urgency
              figure: the interface standard forbids inventing data, and a
              seat count is one of the easiest things in software to lie
              about by accident. */}
          <span className={`text-xs font-semibold ${full ? "text-gray-500" : "text-gray-700"}`}>
            {full ? TOUR_COPY.fullyBooked : TOUR_COPY.seatsLeft(tour.seatsLeft)}
          </span>
        </div>
      </div>
    </Link>
  );
}
