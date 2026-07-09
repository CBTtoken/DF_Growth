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
    <section className="flex flex-col items-center gap-8 bg-gray-50 px-4 py-16">
      <h2 className="text-2xl font-bold text-gray-900">What we offer</h2>
      <ul className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
        {services.map((service, i) => (
          <li
            key={i}
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 text-sm text-gray-700 shadow-sm"
          >
            <span
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: accentColor }}
            >
              ✓
            </span>
            {service}
          </li>
        ))}
      </ul>
    </section>
  );
}
