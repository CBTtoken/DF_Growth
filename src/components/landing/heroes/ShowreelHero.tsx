import Image from "next/image";
import { readableTextOn, withAlpha } from "@/lib/color";

/**
 * "Marquee": a hero for events and occasion businesses, the platform's
 * first considered-purchase shape.
 *
 * The trade heroes (JobCard, Pipeline) exist for a visitor with a burst
 * pipe who wants a number in four seconds. This visitor is planning a
 * wedding or a corporate function: they browse, compare and look at
 * pictures before they talk to anyone. So the photography shares the top
 * of the page with the headline instead of hiding until lg, the serif
 * carries an occasion register rather than an industrial one, and the one
 * primary action is an enquiry, not a call-out.
 *
 * The Build Kit rule for done-for-you builds still holds: tappable
 * contact is visible without scrolling. WhatsApp and phone sit as quiet
 * pills under the primary action, present but never competing with it,
 * per the interface standard's one-primary-action rule.
 *
 * The strip under the hero renders only real record fields (areas served,
 * phone, email) and drops empty cells, so it can never manufacture a fact.
 */
export function ShowreelHero({
  businessName,
  logoUrl,
  headline,
  subheadline,
  ctaLabel,
  primaryColor,
  secondaryColor,
  facebookUrl,
  instagramUrl,
  websiteUrl,
  shopHref,
  ctaHref = "#lead-form",
  callPhone,
  whatsappPhone,
  contactEmail,
  areasServed,
  photoUrls = [],
}: {
  businessName: string;
  logoUrl: string | null;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  primaryColor: string;
  secondaryColor: string;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  websiteUrl?: string | null;
  shopHref?: string;
  ctaHref?: string;
  callPhone?: string | null;
  whatsappPhone?: string | null;
  contactEmail?: string | null;
  /** Plain-words service area, e.g. "Pretoria, Centurion and Johannesburg". */
  areasServed?: string | null;
  /** Up to two gallery photos for the hero collage; fewer is fine. */
  photoUrls?: string[];
}) {
  const field = secondaryColor;
  const onField = readableTextOn(field);
  const onPrimary = readableTextOn(primaryColor);
  const [leadPhoto, secondPhoto] = photoUrls;

  const stripCells = [
    areasServed ? { label: "Where we work", value: areasServed, href: undefined as string | undefined } : null,
    callPhone ? { label: "Call or WhatsApp", value: callPhone, href: `tel:${callPhone.replace(/\s+/g, "")}` } : null,
    contactEmail ? { label: "Email", value: contactEmail, href: `mailto:${contactEmail}` } : null,
  ].filter((c): c is { label: string; value: string; href: string | undefined } => c !== null);

  return (
    <header id="top" className="relative overflow-hidden" style={{ backgroundColor: field }}>
      <div className="relative mx-auto max-w-6xl px-5 pb-12 pt-8 sm:px-8 sm:pb-16 sm:pt-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={businessName}
              width={420}
              height={140}
              priority
              className="h-14 w-auto max-w-[260px] rounded-full bg-white/95 object-contain px-2 py-1 sm:h-[4.5rem] sm:max-w-[360px]"
            />
          ) : (
            <span
              className="text-xl font-semibold tracking-tight font-[family-name:var(--font-anchor-serif)]"
              style={{ color: onField }}
            >
              {businessName}
            </span>
          )}

          <SocialRow
            businessName={businessName}
            facebookUrl={facebookUrl}
            instagramUrl={instagramUrl}
            websiteUrl={websiteUrl}
            textColor={onField}
          />
        </div>

        <div className="mt-10 grid items-center gap-10 lg:mt-14 lg:grid-cols-[1fr_0.95fr] lg:gap-14">
          <div>
            {/* A double rule above the name: the invitation register, the
                same material as the theme's card frames. */}
            <div className="inline-block">
              <p
                className="border-y-[3px] border-double py-2 text-xs font-bold uppercase tracking-[0.3em]"
                style={{ color: onField, borderColor: withAlpha(onField, 0.35) }}
              >
                {businessName}
              </p>
            </div>

            <h1
              className="mt-6 text-[2.6rem] font-bold leading-[1.05] tracking-tight font-[family-name:var(--font-anchor-serif)] sm:text-5xl lg:text-6xl"
              style={{ color: onField }}
            >
              {headline}
            </h1>
            {subheadline && (
              <p className="mt-5 max-w-xl text-base leading-relaxed opacity-90 sm:text-lg" style={{ color: onField }}>
                {subheadline}
              </p>
            )}

            {/* One primary action; contact present but quiet. */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <a
                href={ctaHref}
                className="inline-flex items-center justify-center rounded-full px-8 py-4 text-base font-bold shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
                style={{ backgroundColor: primaryColor, color: onPrimary }}
              >
                {ctaLabel}
              </a>
              {whatsappPhone && (
                <a
                  href={whatsAppLink(whatsappPhone)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border px-6 py-4 text-base font-semibold transition hover:-translate-y-0.5"
                  style={{ borderColor: withAlpha(onField, 0.4), color: onField }}
                >
                  <WhatsAppIcon />
                  WhatsApp
                </a>
              )}
              {callPhone && (
                <a
                  href={`tel:${callPhone.replace(/\s+/g, "")}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border px-6 py-4 text-base font-semibold transition hover:-translate-y-0.5"
                  style={{ borderColor: withAlpha(onField, 0.4), color: onField }}
                >
                  <PhoneIcon />
                  Call
                </a>
              )}
              {shopHref && (
                <a
                  href={shopHref}
                  className="inline-flex items-center justify-center rounded-full border px-6 py-4 text-base font-semibold transition hover:-translate-y-0.5"
                  style={{ borderColor: withAlpha(onField, 0.4), color: onField }}
                >
                  Shop
                </a>
              )}
            </div>
          </div>

          {/* The showreel: photography shares the top of the page. On a
              phone one wide frame below the words; on desktop a layered
              pair, the second tucked behind like prints on a table. */}
          {leadPhoto && (
            <div className="relative">
              <div className="relative aspect-[16/10] w-full overflow-hidden shadow-2xl lg:aspect-[4/3]">
                <Image
                  src={leadPhoto}
                  alt={`An event by ${businessName}`}
                  fill
                  sizes="(max-width: 1024px) 90vw, 45vw"
                  priority
                  className="object-cover"
                />
              </div>
              {secondPhoto && (
                <div
                  className="absolute -bottom-6 -left-6 hidden aspect-square w-36 overflow-hidden border-4 shadow-xl lg:block xl:w-44"
                  style={{ borderColor: field }}
                >
                  <Image src={secondPhoto} alt="" fill sizes="180px" className="object-cover" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {stripCells.length > 0 && (
        <div className="relative border-t" style={{ borderColor: withAlpha(onField, 0.2) }}>
          <div
            className="mx-auto grid max-w-6xl grid-cols-1 divide-y px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8"
            style={{ borderColor: withAlpha(onField, 0.15) }}
          >
            {stripCells.map((cell) => (
              <div key={cell.label} className="py-4 sm:px-6 sm:first:pl-0 sm:last:pr-0">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] opacity-70" style={{ color: onField }}>
                  {cell.label}
                </p>
                {cell.href ? (
                  <a
                    href={cell.href}
                    className="mt-0.5 block text-sm font-semibold underline-offset-4 hover:underline sm:text-base"
                    style={{ color: onField }}
                  >
                    {cell.value}
                  </a>
                ) : (
                  <p className="mt-0.5 text-sm font-semibold sm:text-base" style={{ color: onField }}>
                    {cell.value}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

function PhoneIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.074-.149-.668-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

function SocialRow({
  businessName,
  facebookUrl,
  instagramUrl,
  websiteUrl,
  textColor,
}: {
  businessName: string;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  websiteUrl?: string | null;
  textColor: string;
}) {
  if (!facebookUrl && !instagramUrl && !websiteUrl) return null;
  return (
    <span className="flex items-center gap-3" style={{ color: textColor }}>
      {websiteUrl && (
        <a href={websiteUrl} target="_blank" rel="noreferrer" aria-label={`${businessName} website`} className="opacity-75 transition hover:opacity-100">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="9.5" />
            <path d="M2.5 12h19M12 2.5c2.5 2.6 3.8 5.9 3.8 9.5s-1.3 6.9-3.8 9.5c-2.5-2.6-3.8-5.9-3.8-9.5S9.5 5.1 12 2.5Z" />
          </svg>
        </a>
      )}
      {facebookUrl && (
        <a href={facebookUrl} target="_blank" rel="noreferrer" aria-label={`${businessName} on Facebook`} className="opacity-75 transition hover:opacity-100">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12z" />
          </svg>
        </a>
      )}
      {instagramUrl && (
        <a href={instagramUrl} target="_blank" rel="noreferrer" aria-label={`${businessName} on Instagram`} className="opacity-75 transition hover:opacity-100">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
            <circle cx="12" cy="12" r="4.5" />
            <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
          </svg>
        </a>
      )}
    </span>
  );
}

/**
 * A South African number as wa.me wants it — members type "064 558 3714",
 * wa.me needs the full international form with no spaces or plus.
 */
function whatsAppLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const international = digits.startsWith("0") ? `27${digits.slice(1)}` : digits;
  return `https://wa.me/${international}`;
}
