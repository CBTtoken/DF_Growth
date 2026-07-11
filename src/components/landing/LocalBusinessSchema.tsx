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
}: {
  businessName: string;
  description: string | null;
  url: string;
  logoUrl: string | null;
  telephone: string | null;
  email: string | null;
  address: string | null;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: businessName,
    ...(description ? { description } : {}),
    url,
    ...(logoUrl ? { image: logoUrl } : {}),
    ...(telephone ? { telephone } : {}),
    ...(email ? { email } : {}),
    ...(address && address !== "Online" ? { address: { "@type": "PostalAddress", streetAddress: address } } : {}),
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}
