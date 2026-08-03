// The Facebook links, empty until the new ones are supplied.
//
// These held the previous group URLs, from before the rename. Dewald, 3
// August 2026: the groups were renamed and the old links cleared, "we can
// refresh or add again if required".
//
// Emptied rather than deleted along with the section around them, because
// the groups still exist. Filling these two lines in brings the section
// straight back, which is a smaller job than rebuilding it later from
// nothing.
//
// While both are empty the whole section renders nothing, which is the point:
// a heading reading "Find Us on Facebook" above two cards that link nowhere
// is worse on a live page than no section at all.
const DEAL_ROOM_URL = "";
const PUBLIC_GROUP_URL = "";

export function FacebookGroups() {
  if (!DEAL_ROOM_URL && !PUBLIC_GROUP_URL) return null;

  return (
    <section className="bg-brand px-6 py-20">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 text-center">
        <span className="font-badge text-xs uppercase tracking-[0.25em] text-white/80">
          Where the Conversation Happens
        </span>
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Find Us on Facebook
        </h2>
      </div>

      <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
        {DEAL_ROOM_URL && (
        <a
          href={DEAL_ROOM_URL}
          target="_blank"
          rel="noreferrer"
          className="group flex flex-col gap-2 rounded-2xl bg-white p-6 text-left shadow-lg shadow-black/10 transition hover:-translate-y-0.5"
        >
          <span className="text-xs font-bold uppercase tracking-wide text-brand">Members Only</span>
          <h3 className="text-lg font-bold text-ink">KatisoBiz Nomads Deal Room</h3>
          <p className="text-sm text-gray-500">
            The private group. Real B2B leads and partnerships between DigitalFlyer members.
          </p>
          <span className="mt-2 text-sm font-semibold text-brand group-hover:underline">
            Request to join →
          </span>
        </a>
        )}

        {PUBLIC_GROUP_URL && (
        <a
          href={PUBLIC_GROUP_URL}
          target="_blank"
          rel="noreferrer"
          className="group flex flex-col gap-2 rounded-2xl bg-white p-6 text-left shadow-lg shadow-black/10 transition hover:-translate-y-0.5"
        >
          <span className="text-xs font-bold uppercase tracking-wide text-brand">Open to Everyone</span>
          <h3 className="text-lg font-bold text-ink">KatisoBiz Nomads</h3>
          <p className="text-sm text-gray-500">
            The public group. A wider look at what we&apos;re building, open to anyone interested.
          </p>
          <span className="mt-2 text-sm font-semibold text-brand group-hover:underline">
            Join the group →
          </span>
        </a>
        )}
      </div>
    </section>
  );
}
