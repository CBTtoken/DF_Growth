// Server component. servicesText is stored as plain text, one service per
// line (see src/lib/ai/draft-copy.ts and the Landing Copy step) so it stays
// a normal editable textarea rather than needing a dynamic list-editor UI.
export function ServicesList({
  servicesText,
  accentColor,
}: {
  servicesText: string | null;
  accentColor: string;
}) {
  const services = (servicesText ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (services.length === 0) return null;

  return (
    <section id="services" className="border-b border-gray-100 bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8 sm:py-24">
        <p className="font-mono text-xs uppercase tracking-[0.2em]" style={{ color: accentColor }}>
          02 — What we offer
        </p>
        <h2 className="mt-3 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl">
          Everything you need, in one place.
        </h2>

        <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {services.map((service, i) => (
            <li
              key={i}
              className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-colors hover:border-current"
              style={{ color: accentColor }}
            >
              <span
                className="grid size-11 flex-shrink-0 place-items-center rounded-xl text-sm font-bold"
                style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}
              >
                ✓
              </span>
              <span className="mt-2.5 text-base font-medium text-gray-700">{service}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
