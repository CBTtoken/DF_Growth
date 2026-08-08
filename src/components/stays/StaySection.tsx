import Image from "next/image";
import { AmenityRow } from "@/components/stays/AmenityRow";
import { DatePicker } from "@/components/stays/DatePicker";
import { STAY_COPY } from "@/lib/stays/copy";
import type { StaysProperty } from "@/lib/stays/types";

/**
 * "Stay with us", the first of the two sections on a member's page.
 *
 * Handoff Job 10: do not build a long scrolling page. Two clean sections,
 * and everything long lives one click away. So this is photos, a short
 * description, the property amenities and the picker, full stop. No room
 * list, no rates table, no gallery of every bed in the house.
 *
 * Room types deliberately do not appear here at all, at any point. Not
 * collapsed, not greyed out, not "from R950". A room shown before dates are
 * chosen is a room we cannot promise, and acceptance criterion 16 is that
 * they are not visible before dates are chosen.
 */
export function StaySection({
  clientSlug,
  property,
  photoUrls,
  accentColor,
  businessName,
}: {
  clientSlug: string;
  property: StaysProperty;
  photoUrls: string[];
  accentColor: string;
  businessName: string;
}) {
  const photos = photoUrls.slice(0, 3);

  return (
    <section id="stay" className="scroll-mt-20 bg-white px-4 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          {STAY_COPY.sectionTitle}
        </h2>

        {property.intro && (
          <p className="mt-3 max-w-2xl whitespace-pre-line text-base leading-relaxed text-gray-600">
            {property.intro}
          </p>
        )}

        {photos.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((url, index) => (
              <div
                key={url}
                className={`relative aspect-4/3 overflow-hidden rounded-2xl bg-gray-100 ${
                  index === 0 ? "col-span-2 sm:col-span-1" : ""
                }`}
              >
                <Image
                  src={url}
                  alt={`${businessName}, where you will stay`}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {property.amenities.length > 0 && (
          <AmenityRow slugs={property.amenities} level="property" accentColor={accentColor} className="mt-6" />
        )}

        <div className="mt-8 rounded-3xl border border-gray-100 bg-gray-50 p-5 shadow-sm sm:p-6">
          <p className="text-sm font-semibold text-gray-900">{STAY_COPY.sectionLead}</p>
          <div className="mt-4">
            <DatePicker action={`/${clientSlug}/stay`} accentColor={accentColor} />
          </div>
          {(property.checkInFrom || property.checkOutBy) && (
            <p className="mt-4 text-xs text-gray-500">
              {property.checkInFrom && `Check in from ${property.checkInFrom}.`}
              {property.checkInFrom && property.checkOutBy && " "}
              {property.checkOutBy && `Check out by ${property.checkOutBy}.`}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
