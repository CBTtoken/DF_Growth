// Server component. Plain query-based Google Maps embed — no API key
// needed. Renders nothing for an online-only business or a missing address.
export function LocationMap({
  businessAddress,
  accentColor,
  eyebrowNumber,
}: {
  businessAddress: string | null;
  accentColor: string;
  eyebrowNumber: string;
}) {
  if (!businessAddress || businessAddress === "Online") return null;

  const src = `https://www.google.com/maps?q=${encodeURIComponent(businessAddress)}&output=embed`;

  return (
    <section className="border-b border-gray-100 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8 sm:py-24">
        <div className="grid gap-8 md:grid-cols-2 md:items-center md:gap-14">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em]" style={{ color: accentColor }}>
              {eyebrowNumber} — Where we are
            </p>
            <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl">
              Find us
            </h2>
            <p className="mt-3 flex items-center gap-2 text-base text-gray-600">
              <span aria-hidden style={{ color: accentColor }}>📍</span>
              {businessAddress}
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
            <iframe
              title="Business location"
              src={src}
              width="100%"
              height="288"
              className="grayscale-[0.2]"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
