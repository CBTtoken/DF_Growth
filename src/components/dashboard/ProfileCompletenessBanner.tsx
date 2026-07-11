import Link from "next/link";

// Sprint 1, Build Item 6: a nudge, not an enforcement mechanism — never
// blocks any other dashboard functionality. Also directly supports the
// SEO push from earlier this sprint, since JSON-LD LocalBusiness schema
// quality (src/components/landing/LocalBusinessSchema.tsx) depends on this
// same data actually being filled in.
export function ProfileCompletenessBanner({
  hasBusinessDescription,
  hasBusinessAddress,
  photoCount,
}: {
  hasBusinessDescription: boolean;
  hasBusinessAddress: boolean;
  photoCount: number;
}) {
  const items = [
    { label: "Add a business description", done: hasBusinessDescription },
    { label: "Add your business address", done: hasBusinessAddress },
    { label: "Add at least 2 photos", done: photoCount >= 2 },
  ];

  const missing = items.filter((i) => !i.done);
  if (missing.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div>
        <h2 className="text-sm font-bold tracking-tight text-ink">Finish setting up your page</h2>
        <p className="mt-0.5 text-xs text-gray-600">
          A more complete profile helps customers trust you and helps your page get found on Google.
        </p>
      </div>
      <ul className="flex flex-wrap gap-2">
        {missing.map((item) => (
          <li key={item.label}>
            <Link
              href="/dashboard/edit"
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-amber-400"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
