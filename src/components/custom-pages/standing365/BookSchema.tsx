// STANDING365_LANDING_BUILD_SPEC_CLAUDE.md Sec 3: Book schema rather than
// LocalBusiness (see components/landing/LocalBusinessSchema.tsx) — this is
// a product page for one specific book, not a business listing.
export function BookSchema({ url }: { url: string }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: "Standing 365",
    author: { "@type": "Person", name: "Dewald Rosema" },
    description:
      "365 Daily Devotions for Real People in Real Hard Seasons. Not for the people who have it all together — for everyone still standing in the middle of the hard thing.",
    url,
    workExample: [
      {
        "@type": "Book",
        bookFormat: "https://schema.org/Paperback",
        offers: { "@type": "Offer", price: "299.00", priceCurrency: "ZAR", availability: "https://schema.org/PreOrder" },
      },
      {
        "@type": "Book",
        bookFormat: "https://schema.org/EBook",
        url: "https://www.amazon.com/dp/B0H298566F",
        offers: { "@type": "Offer", availability: "https://schema.org/InStock" },
      },
    ],
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}
