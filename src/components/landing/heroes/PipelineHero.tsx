import Image from "next/image";
import { readableTextOn, withAlpha } from "@/lib/color";

/**
 * "Copperline": a hero for the neighbourhood trades of the informal market.
 *
 * The visitor is usually a neighbour or a referral, on a phone, and the way
 * business actually starts in this market is a WhatsApp message. So this is
 * the first hero where WhatsApp is the PRIMARY action, in WhatsApp's own
 * green, because for this audience that colour reads "message them now"
 * faster than any brand-palette button could. Calling is second, the quote
 * form third.
 *
 * The copper line is the theme's signature: one horizontal run in fixed
 * copper (the trade's own material, all over a plumber's real photos) that
 * enters from the page edge, carries two junction rings, and hands off to
 * the action row. Pure CSS, nothing to download.
 *
 * Like DuoHero and JobCardHero, tappable contact sits in the hero: the
 * Growth Build Kit rule for done-for-you builds. The deviation lives inside
 * this one component; members on other templates see no change.
 *
 * The base strip renders only real record fields and drops any empty cell,
 * so it can never manufacture a fact.
 */
const COPPER = "#b87333";
const WHATSAPP_GREEN = "#1faa53";

export function PipelineHero({
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
  city,
  photoUrl,
  photoIsOwn = false,
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
  city?: string | null;
  photoUrl?: string | null;
  /** True only when the photo is the member's own upload (hero_photo_id),
      never for a library/fallback ambient image — the "A real job, our
      photo" caption is a credibility claim and may only appear on real
      member photos (house rule: ambient imagery never poses as their work). */
  photoIsOwn?: boolean;
}) {
  const field = secondaryColor;
  const onField = readableTextOn(field);
  const onPrimary = readableTextOn(primaryColor);

  const baseCells = [
    city ? { label: "Based in", value: city, href: undefined as string | undefined } : null,
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
              className="h-14 w-auto max-w-[260px] rounded-lg bg-white/95 object-contain px-3 py-1.5 sm:h-[4.5rem] sm:max-w-[360px]"
            />
          ) : (
            <span className="text-xl font-semibold tracking-tight" style={{ color: onField }}>
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

        <div className="mt-10 grid items-center gap-10 lg:mt-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          <div>
            {/* The copper line runs in from the page edge and carries the
                business name like a tag on a pipe. */}
            <div className="relative -ml-5 flex items-center gap-3 pl-5 sm:-ml-8 sm:pl-8">
              <span
                aria-hidden
                className="h-[3px] w-10 shrink-0 rounded-full sm:w-16"
                style={{ background: `linear-gradient(90deg, transparent, ${COPPER})` }}
              />
              <span aria-hidden className="size-2.5 shrink-0 rounded-full border-2" style={{ borderColor: COPPER }} />
              <p className="text-xs font-bold uppercase tracking-[0.28em]" style={{ color: COPPER }}>
                {businessName}
              </p>
            </div>

            <h1
              className="mt-4 text-[2.5rem] font-bold leading-[1.06] tracking-tight font-[family-name:var(--font-anchor-display)] sm:text-5xl lg:text-6xl"
              style={{ color: onField }}
            >
              {headline}
            </h1>
            {subheadline && (
              <p className="mt-5 max-w-xl text-base leading-relaxed opacity-90 sm:text-lg" style={{ color: onField }}>
                {subheadline}
              </p>
            )}

            {/* WhatsApp leads, calling follows, the form comes third. All
                three stack full-width on a phone at proper thumb size. */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {whatsappPhone && (
                <a
                  href={whatsAppLink(whatsappPhone)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2.5 rounded-full px-7 py-4 text-base font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
                  style={{ backgroundColor: WHATSAPP_GREEN }}
                >
                  <WhatsAppIcon />
                  WhatsApp us now
                </a>
              )}
              {callPhone && (
                <a
                  href={`tel:${callPhone.replace(/\s+/g, "")}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-base font-bold shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
                  style={{ backgroundColor: primaryColor, color: onPrimary }}
                >
                  <PhoneIcon />
                  {callPhone}
                </a>
              )}
              <a
                href={ctaHref}
                className="inline-flex items-center justify-center rounded-full border-2 px-7 py-4 text-base font-bold transition hover:-translate-y-0.5"
                style={{ borderColor: withAlpha(onField, 0.45), color: onField }}
              >
                {ctaLabel}
              </a>
              {shopHref && (
                <a
                  href={shopHref}
                  className="inline-flex items-center justify-center rounded-full border-2 px-6 py-4 text-base font-bold transition hover:-translate-y-0.5"
                  style={{ borderColor: withAlpha(onField, 0.45), color: onField }}
                >
                  Shop
                </a>
              )}
            </div>
          </div>

          {/* The photo panel: a real job in a warm frame with the theme's
              copper seam. Hidden below lg like the other done-for-you
              heroes — on a phone the buttons matter more. */}
          {photoUrl && (
            <div className="relative hidden lg:block">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border-t-4 shadow-2xl" style={{ borderColor: COPPER }}>
                <Image src={photoUrl} alt="" fill sizes="(max-width: 1024px) 0px, 42vw" priority className="object-cover" />
              </div>
              {photoIsOwn && (
                <span
                  className="absolute -bottom-3 left-4 inline-block rounded-full px-4 py-1 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-white"
                  style={{ backgroundColor: COPPER }}
                >
                  A real job, our photo
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* The base strip: plain labels, only real fields. */}
      {baseCells.length > 0 && (
        <div className="relative border-t" style={{ borderColor: withAlpha(onField, 0.2) }}>
          <div
            className="mx-auto grid max-w-6xl grid-cols-1 divide-y px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8"
            style={{ borderColor: withAlpha(onField, 0.15) }}
          >
            {baseCells.map((cell) => (
              <div key={cell.label} className="py-4 sm:px-6 sm:first:pl-0 sm:last:pr-0">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em]" style={{ color: COPPER }}>
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
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
 * A South African number as wa.me wants it — members type "067 954 7503",
 * wa.me needs the full international form with no spaces or plus.
 */
function whatsAppLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const international = digits.startsWith("0") ? `27${digits.slice(1)}` : digits;
  return `https://wa.me/${international}`;
}
