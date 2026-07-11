// Shown both pre-signup (pricing page, as a value-prop) and post-signup
// (dashboard, as an actionable next step) — same block works for both, the
// surrounding heading/framing differs by page, not this component.
//
// Both of these are deliberately NOT self-serve web forms. Marketplace
// listing is a real, live benefit of any paid membership (every tier gets
// their page in the marketplace) — it is NOT "coming soon"; only the
// WhatsApp channel for requesting it is still pending Meta verification.
// Falls back to a plain email request in the meantime so the benefit is
// actually usable today, matching the same fallback pattern used for
// Enterprise's waitlist CTA. Dewald builds the marketplace page himself
// once someone reaches out (a real manual/concierge process, not instant
// automation) — routing through WhatsApp-or-email matches that reality.
// RE:Biz Nomads is a live Facebook group, joining is literally just
// clicking through and requesting to join.
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
const REBIZ_GROUP_URL = "https://www.facebook.com/groups/rebiznomadsdealroom";

export function EcosystemAccess() {
  const whatsappHref = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
        "Hi, I'd like to get my business listed on the DigitalFlyer SA marketplace."
      )}`
    : "mailto:info@digitalflyer.co.za?subject=Marketplace%20listing%20request";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold tracking-tight text-ink">DigitalFlyer SA Marketplace</h3>
        <p className="text-sm text-gray-500">
          Every paid membership gets a spot on our marketplace directory too — say hello and
          we&apos;ll take care of the rest.
        </p>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark"
        >
          {WHATSAPP_NUMBER ? "Message us on WhatsApp" : "Request your listing"}
        </a>
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
