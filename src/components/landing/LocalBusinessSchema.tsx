import { schemaTypeForIndustry } from "@/lib/schema-type";

// JSON-LD structured data — one of the highest-leverage things a small
// business page can have for showing up in Google's local pack / Maps
// results, distinct from (and in addition to) the plain meta description.
// Server component, no client JS needed; renders a plain <script> tag.
export function LocalBusinessSchema({
  businessName,
  description,
  url,
  logoUrl,
  telephone,
  email,
  address,
  industry,
  city,
}: {
  businessName: string;
  description: string | null;
  url: string;
  logoUrl: string | null;
  telephone: string | null;
  email: string | null;
  address: string | null;
  industry: string | null;
  city: string | null;
}) {
  // SEO fix: @type was always the generic "LocalBusiness", telling search
  // engines nothing about what kind of business this actually is — a real
  // ranking factor for unbranded local search. Mapped from the business's
  // own industry now (src/lib/schema-type.ts), falls back to the generic
  // type when there's no confident match rather than guessing wrong.
  const schema = {
    "@context": "https://schema.org",
    "@type": schemaTypeForIndustry(industry),
    name: businessName,
    ...(description ? { description } : {}),
    url,
    ...(logoUrl ? { image: logoUrl } : {}),
    ...(telephone ? { telephone } : {}),
    ...(email ? { email } : {}),
    ...(address && address !== "Online"
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: address,
            ...(city ? { addressLocality: city } : {}),
            addressCountry: "ZA",
          },
        }
      : city
        ? { address: { "@type": "PostalAddress", addressLocality: city, addressCountry: "ZA" } }
        : {}),
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}
