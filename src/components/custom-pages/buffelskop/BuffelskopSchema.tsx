// Product schema, not LocalBusiness (see components/landing/LocalBusinessSchema.tsx)
// — this page sells one product in two grinds, matching the Standing365
// BookSchema.tsx precedent of a product-specific schema for a bespoke page.
export function BuffelskopSchema({ url }: { url: string }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Buffelskop Premium Sundried Cayenne Chilli Powder",
    description:
      "Premium preservative-free sundried cayenne chilli powder. Hand-picked, naturally sun-dried and freshly milled. Available in fine or coarse powder.",
    brand: { "@type": "Brand", name: "Buffelskop" },
    url,
    offers: [
      {
        "@type": "Offer",
        name: "Sundried Cayenne Chilli Powder — Fine",
        price: "80.00",
        priceCurrency: "ZAR",
        priceValidUntil: "2027-07-18",
        availability: "https://schema.org/InStock",
        areaServed: "ZA",
      },
      {
        "@type": "Offer",
        name: "Sundried Cayenne Chilli Powder — Coarse",
        price: "80.00",
        priceCurrency: "ZAR",
        priceValidUntil: "2027-07-18",
        availability: "https://schema.org/InStock",
        areaServed: "ZA",
      },
    ],
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}
