// Shown both pre-signup (pricing page, as a value-prop) and post-signup
// (dashboard, as an actionable next step) — same block works for both, the
// surrounding heading/framing differs by page, not this component.
//
// Both of these are deliberately NOT self-serve web forms. Marketplace
// listing is a real thing but a manual/concierge process (Dewald builds the
// page himself once someone reaches out) — routing it through WhatsApp
// matches that reality instead of implying instant automation that doesn't
// exist. RE:Biz Nomads is a live Facebook group, joining is literally just
// clicking through and requesting to join.
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
const REBIZ_GROUP_URL = "https://www.facebook.com/groups/rebiznomadsdealroom";

export function EcosystemAccess() {
  const whatsappHref = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
        "Hi, I'd like to get my business listed on the DigitalFlyer SA marketplace."
      )}`
    : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold tracking-tight text-ink">DigitalFlyer SA Marketplace</h3>
        <p className="text-sm text-gray-500">
          Get your business listed on our marketplace directory too — message us on WhatsApp, say
          hello, and we&apos;ll take care of the rest.
        </p>
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark"
          >
            Message us on WhatsApp
          </a>
        ) : (
          <span className="mt-2 inline-flex w-fit items-center rounded-full bg-gray-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Coming soon
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold tracking-tight text-ink">RE:Biz Nomads Community</h3>
        <p className="text-sm text-gray-500">
          Join our private community of South African business owners — deals, support, and real
          conversations with people building the same thing you are.
        </p>
        <a
          href={REBIZ_GROUP_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark"
        >
          Join the group
        </a>
      </div>
    </div>
  );
}
