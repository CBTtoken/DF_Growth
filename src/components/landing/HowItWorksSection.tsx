// Server component, same conditional-eyebrow pattern as the rest of
// src/components/landing/*. Only used by the "Interactive Step-by-Step"
// template (see templateConfig.ts) — generic process copy on purpose
// (no client fills in "how it works" steps anywhere in onboarding), since
// "share your details → get a plan → we deliver" is honestly true of any
// service business rather than a fabricated claim about a specific one.
const steps = [
  { title: "Tell us what you need", desc: "Reach out through the form below — no lengthy questionnaires, just the essentials." },
  { title: "Get a tailored response", desc: "We'll get back to you with next steps, pricing, and a clear idea of timing." },
  { title: "We get it done", desc: "Sit back while we take care of the rest, with updates along the way." },
];

export function HowItWorksSection({ accentColor, eyebrowNumber }: { accentColor: string; eyebrowNumber: string }) {
  return (
    <section className="border-b border-gray-100 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8 sm:py-24">
        <p className="font-mono text-xs uppercase tracking-[0.2em]" style={{ color: accentColor }}>
          {eyebrowNumber} — How it works
        </p>
        <h2 className="mt-3 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl">
          Three simple steps.
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
              <span
                className="grid size-10 place-items-center rounded-full text-sm font-bold"
                style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}
              >
                {i + 1}
              </span>
              <h3 className="mt-4 text-base font-semibold text-gray-900">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
