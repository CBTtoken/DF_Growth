const DEAL_ROOM_URL = "https://www.facebook.com/groups/rebiznomadsdealroom";
const PUBLIC_GROUP_URL = "https://www.facebook.com/REBizNomads";

export function FacebookGroups() {
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
        <a
          href={DEAL_ROOM_URL}
          target="_blank"
          rel="noreferrer"
          className="group flex flex-col gap-2 rounded-2xl bg-white p-6 text-left shadow-lg shadow-black/10 transition hover:-translate-y-0.5"
        >
          <span className="text-xs font-bold uppercase tracking-wide text-brand">Members Only</span>
          <h3 className="text-lg font-bold text-ink">RE:Biz Deal Room</h3>
          <p className="text-sm text-gray-500">
            The private group — real B2B leads and partnerships between DigitalFlyer members.
          </p>
          <span className="mt-2 text-sm font-semibold text-brand group-hover:underline">
            Request to join →
          </span>
        </a>

        <a
          href={PUBLIC_GROUP_URL}
          target="_blank"
          rel="noreferrer"
          className="group flex flex-col gap-2 rounded-2xl bg-white p-6 text-left shadow-lg shadow-black/10 transition hover:-translate-y-0.5"
        >
          <span className="text-xs font-bold uppercase tracking-wide text-brand">Open to Everyone</span>
          <h3 className="text-lg font-bold text-ink">RE:Biz Nomads</h3>
          <p className="text-sm text-gray-500">
            The public group — a wider look at what we&apos;re building, open to anyone interested.
          </p>
          <span className="mt-2 text-sm font-semibold text-brand group-hover:underline">
            Join the group →
          </span>
        </a>
      </div>
    </section>
  );
}
