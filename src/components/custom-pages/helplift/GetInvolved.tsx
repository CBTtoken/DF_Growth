import { Phone, MapPin, Clock, Facebook, HeartHandshake, Users, Handshake } from "lucide-react";
import { HELPLIFT_BLUE, HELPLIFT_BLUE_DARK, HELPLIFT_LIME_DARK, HELPLIFT_INK, HELPLIFT_CREAM, PARTNER_REFERRAL_URL } from "./brand";

// Sec 3 Get Involved / Contact + Partner button. As an NPO (not a sales
// page) the calls to action are give / volunteer / partner, never "buy now."
// The contact form itself is the shared LeadForm, rendered by HelpliftPage;
// this section carries the ways-to-help framing, the confirmed contact
// details, and the real agent-referral "Partner With Us" button.
const WAYS = [
  { icon: HeartHandshake, title: "Give", body: "Donate goods or funds through our voucher programme and reach families directly." },
  { icon: Users, title: "Volunteer", body: "Lend your time and skills to our stores, courses and support work." },
  { icon: Handshake, title: "Partner", body: "Connect your organisation with ours to multiply the impact across the Vaal Triangle." },
];

export function GetInvolved({
  callPhone,
  address,
}: {
  callPhone: string | null;
  address: string | null;
}) {
  const partnerHref = PARTNER_REFERRAL_URL ?? "#lead-form";

  return (
    <section className="px-5 py-20 sm:px-8 sm:py-24" style={{ backgroundColor: HELPLIFT_CREAM }}>
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: HELPLIFT_LIME_DARK }}>
            Get Involved
          </span>
          <h2 className="mt-3 font-[family-name:var(--font-helplift-heading)] text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: HELPLIFT_INK }}>
            There&rsquo;s a place for you in this
          </h2>
          <p className="mt-4 text-base leading-relaxed text-gray-600">
            Every bit of help lifts someone. Here&rsquo;s how you can be part of it.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {WAYS.map((w) => {
            const Icon = w.icon;
            return (
              <div key={w.title} className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
                <span className="mx-auto grid size-12 place-items-center rounded-full" style={{ backgroundColor: `${HELPLIFT_LIME_DARK}1a`, color: HELPLIFT_LIME_DARK }}>
                  <Icon className="size-6" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="mt-4 font-[family-name:var(--font-helplift-heading)] text-lg font-bold" style={{ color: HELPLIFT_INK }}>{w.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{w.body}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 grid gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:grid-cols-2 sm:p-8">
          <ul className="space-y-3 text-sm text-gray-700">
            {callPhone && (
              <li className="flex items-center gap-3">
                <Phone className="size-4 shrink-0" style={{ color: HELPLIFT_BLUE }} aria-hidden />
                <a href={`tel:${callPhone.replace(/\s+/g, "")}`} className="font-medium hover:underline">{callPhone}</a>
              </li>
            )}
            {address && (
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0" style={{ color: HELPLIFT_BLUE }} aria-hidden />
                <span>{address}</span>
              </li>
            )}
            <li className="flex items-start gap-3">
              <Clock className="mt-0.5 size-4 shrink-0" style={{ color: HELPLIFT_BLUE }} aria-hidden />
              <span>Mon–Fri 09:00–15:00 · Sat 09:00–12:00</span>
            </li>
            <li className="flex items-center gap-3">
              <Facebook className="size-4 shrink-0" style={{ color: HELPLIFT_BLUE }} aria-hidden />
              <a href="https://www.facebook.com/HelpliftNet" target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                facebook.com/HelpliftNet
              </a>
            </li>
          </ul>

          <div className="flex flex-col items-start justify-center gap-3 sm:items-end sm:text-right">
            <p className="text-sm text-gray-600">
              Represent an organisation that wants to partner with Helplift?
            </p>
            <a
              href={partnerHref}
              {...(PARTNER_REFERRAL_URL ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="inline-flex items-center justify-center rounded-full px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5"
              style={{ backgroundColor: HELPLIFT_BLUE_DARK }}
            >
              Partner With Us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
