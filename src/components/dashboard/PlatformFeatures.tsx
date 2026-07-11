// Shows what's available at a higher tier even when a client can't use it
// yet — same "see the whole platform, unlock as you grow" pattern most SaaS
// dashboards use, rather than only ever showing what a client already has.
// Currently just one locked feature since Enterprise is the only tier with
// something Growth doesn't include; add more cards here as that grows.
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

export function PlatformFeatures({ plan }: { plan: string | null }) {
  if (plan === "enterprise") return null;

  const whatsappHref = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
        "Hi, I'd like to hear more about Enterprise's ad management package."
      )}`
    : null;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink">Grow further</h2>
        <p className="mt-1 text-sm text-gray-500">Available on a higher tier — not part of your plan yet.</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-ink">Full Meta + Google ad management</h3>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Enterprise
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            We run and optimize your ad campaigns for you, across both platforms.
          </p>
        </div>
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark"
          >
            Ask about Enterprise
          </a>
        ) : (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Coming soon
          </span>
        )}
      </div>
    </section>
  );
}
