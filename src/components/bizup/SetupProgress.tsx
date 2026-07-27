import Link from "next/link";

// Dewald, live testing: "the onboarding needs some attention". It was a set
// of disconnected settings pages with no sense of sequence, so after
// finishing one there was no signal about what was left or what came next.
//
// This is the spine. It shows only while setup is genuinely incomplete, and
// it names one next action rather than presenting a menu. Once the member
// has sent their first quote it disappears for good, because a permanent
// checklist on a dashboard is nagging, not onboarding.

export interface SetupState {
  hasBusinessDetails: boolean;
  hasBankDetails: boolean;
  hasSentDocument: boolean;
}

const STEPS = [
  {
    key: "business" as const,
    title: "Your business details",
    why: "This is what prints at the top of every document.",
    href: "/bizup/settings/business",
    action: "Add your details",
  },
  {
    key: "bank" as const,
    title: "Your banking details",
    why: "So your customers know where to pay you.",
    href: "/bizup/settings/banking",
    action: "Add your banking details",
  },
  {
    key: "quote" as const,
    title: "Send your first quote",
    why: "Build it, then send it on WhatsApp from your own number.",
    href: "/bizup/quotes",
    action: "Create a quote",
  },
];

export function SetupProgress({ state }: { state: SetupState }) {
  const done = {
    business: state.hasBusinessDetails,
    bank: state.hasBankDetails,
    quote: state.hasSentDocument,
  };

  if (done.business && done.bank && done.quote) return null;

  const completed = Object.values(done).filter(Boolean).length;
  const next = STEPS.find((s) => !done[s.key])!;

  return (
    <section className="rounded-2xl border border-brand/20 bg-brand/5 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-bold text-ink">Getting set up</h2>
        <span className="text-sm font-medium text-gray-500">{completed} of 3 done</span>
      </div>

      {/* A plain bar rather than a spinner or a percentage. Three steps is
          few enough that the ticks below carry the information; this is
          just reassurance that it is short. */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${(completed / 3) * 100}%` }}
        />
      </div>

      {/* Every step is its own link, not just the next one.
          Dewald: "I still don't have access to setup my bank details as a
          new user." Only the next step was clickable, so with business
          details incomplete the banking step was listed but unreachable,
          which reads as a locked door rather than an ordered list. A member
          should be able to do these in whatever order suits them. */}
      <ol className="mt-4 flex flex-col gap-1">
        {STEPS.map((s) => {
          const isDone = done[s.key];
          const isNext = s.key === next.key;
          return (
            <li key={s.key}>
              <Link
                href={s.href}
                className="-mx-2 flex items-start gap-3 rounded-xl px-2 py-2 transition hover:bg-white"
              >
                <span
                  aria-hidden
                  className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                    isDone ? "bg-green-600 text-white" : isNext ? "bg-brand text-white" : "bg-white text-gray-400"
                  }`}
                >
                  {isDone ? "✓" : STEPS.indexOf(s) + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-semibold ${isDone ? "text-gray-400" : "text-ink"}`}>
                    {s.title}
                  </span>
                  {!isDone && <span className="block text-sm text-gray-600">{s.why}</span>}
                </span>
                {!isDone && (
                  <span aria-hidden className="mt-0.5 shrink-0 text-sm text-gray-400">
                    &rsaquo;
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>

      {/* One action, the next one. A member part-way through setup does not
          need three buttons, they need to know what to do now. */}
      <Link
        href={next.href}
        className="mt-4 inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
      >
        {next.action}
      </Link>

      {!done.bank && (
        <p className="mt-3 text-xs text-gray-500">
          You can skip banking details for now and still build quotes. You will need them before a
          customer can pay you.
        </p>
      )}
    </section>
  );
}
