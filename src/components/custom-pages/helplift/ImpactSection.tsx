import { HELPLIFT_BLUE, HELPLIFT_LIME_DARK, HELPLIFT_INK } from "./brand";

// Sec 3 Impact: lead with this, it's the strongest material. Figures from
// their 2025/26 operational infographic, rounded down with a "+" (not exact
// counts, which go stale fast). Rendered as native page content, not a
// dropped-in graphic (the full infographic still appears in the gallery).
const STATS: { value: string; label: string }[] = [
  { value: "1,600+", label: "beneficiaries assisted" },
  { value: "380+", label: "dedicated donors" },
  { value: "60+", label: "connected organisations" },
  { value: "20+", label: "active volunteers" },
  { value: "R190,000+", label: "worth of goods distributed" },
  { value: "R160,000+", label: "in counselling & emotional support" },
];

export function ImpactSection() {
  return (
    <section className="px-5 py-14 sm:px-8 sm:py-16" style={{ backgroundColor: "#FFFFFF" }}>
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: HELPLIFT_LIME_DARK }}>
            Our Impact
          </span>
          <h2 className="mt-3 font-[family-name:var(--font-helplift-heading)] text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: HELPLIFT_INK }}>
            Real help, measured in real lives
          </h2>
          <p className="mt-4 text-base leading-relaxed text-gray-600">
            What the Helplift community made possible in 2025/26 — and these numbers keep growing.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center rounded-2xl border border-gray-100 bg-white px-4 py-8 text-center shadow-sm"
            >
              <span className="font-[family-name:var(--font-helplift-heading)] text-3xl font-extrabold tabular-nums sm:text-4xl" style={{ color: HELPLIFT_BLUE }}>
                {s.value}
              </span>
              <span className="mt-2 text-sm font-medium leading-snug text-gray-600">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
