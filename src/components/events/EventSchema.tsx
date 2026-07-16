// List Your Event Sec 5: "Every event page ships with JSON-LD Event
// structured data, Google explicitly supports rendering event date and
// location directly in search results." Deliberately omits `offers` —
// Phase 1's ticket_info_text is free-form descriptive text ("R50 at the
// door," "Book via the organiser"), not structured price data, and Google
// documents `offers` as needing a real price/currency; sending a fabricated
// or guessed price would be worse than omitting the property entirely.
export function EventSchema({
  eventName,
  description,
  startDatetime,
  endDatetime,
  locationAddress,
  city,
  url,
  imageUrl,
}: {
  eventName: string;
  description: string | null;
  startDatetime: string;
  endDatetime: string | null;
  locationAddress: string | null;
  city: string;
  url: string;
  imageUrl: string | null;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: eventName,
    startDate: startDatetime,
    ...(endDatetime ? { endDate: endDatetime } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendedMode",
    location: {
      "@type": "Place",
      name: locationAddress || city,
      address: {
        "@type": "PostalAddress",
        ...(locationAddress ? { streetAddress: locationAddress } : {}),
        addressLocality: city,
        addressCountry: "ZA",
      },
    },
    ...(description ? { description } : {}),
    ...(imageUrl ? { image: [imageUrl] } : {}),
    url,
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}
