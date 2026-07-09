// Server component. Plain query-based Google Maps embed — no API key
// needed. Renders nothing for an online-only business or a missing address.
export function LocationMap({
  businessAddress,
  accentColor,
}: {
  businessAddress: string | null;
  accentColor: string;
}) {
  if (!businessAddress || businessAddress === "Online") return null;

  const src = `https://www.google.com/maps?q=${encodeURIComponent(businessAddress)}&output=embed`;

  return (
    <section className="flex flex-col items-center gap-4 px-4 py-16">
      <h2 className="text-2xl font-bold text-gray-900">Find us</h2>
      <p className="text-sm text-gray-500">{businessAddress}</p>
      <div
        className="w-full max-w-3xl overflow-hidden rounded-2xl border shadow-sm"
        style={{ borderColor: accentColor }}
      >
        <iframe
          title="Business location"
          src={src}
          width="100%"
          height="320"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </section>
  );
}
