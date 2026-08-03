import Image from "next/image";
import { readableTextOn, supportingAccent, withAlpha } from "@/lib/color";

/**
 * "Dual Offer": a hero for a business that genuinely does two things.
 *
 * Every other hero in this library presents one call to action, which is the
 * right answer when a business does one thing. It is the wrong answer for
 * the member this was built for, who organises events and networking and
 * also sells the products she believes in. Funnelling both of those into a
 * single "Get in touch" button loses whichever half the visitor came for.
 *
 * So the hero ends in two doors rather than one, each with a line saying
 * what is behind it. The second door is the shop and appears only when the
 * member actually has products, so a member on this template without a shop
 * gets a single full-width call to action and the layout still reads as
 * finished rather than as a missing box.
 *
 * Three colours, not one. Dewald, 2026-08-03: "be careful that her site is
 * not all green it will look terrible and too dark." The deep field is the
 * member's secondary, the buttons are their primary, and the third is
 * derived by rotating the primary's hue (lib/color.ts), so a green business
 * gets clay and a blue one gets olive gold without anybody choosing a second
 * colour. That third colour is what stops a one-hue page.
 *
 * The logo is rendered at its own width rather than inside a square avatar.
 * Real small-business logos are very often a wide banner lockup with their
 * own background baked in, and squashing one of those into a 40px circle is
 * the single fastest way to make a good business look amateur.
 */
export function DuoHero({
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
  shopBlurb,
  contactBlurb,
  callPhone,
  whatsappPhone,
  photoUrl,
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
  /** Set only when this business has products on sale. */
  shopHref?: string;
  ctaHref?: string;
  shopBlurb?: string;
  contactBlurb?: string;
  callPhone?: string | null;
  whatsappPhone?: string | null;
  /** The member's chosen hero image, or their industry fallback. */
  photoUrl?: string | null;
}) {
  const field = secondaryColor;
  const onField = readableTextOn(field);
  const accent = supportingAccent(primaryColor);
  const onPrimary = readableTextOn(primaryColor);
  const fieldIsDark = onField === "#ffffff";

  return (
    <header id="top" className="relative overflow-hidden" style={{ backgroundColor: field }}>
      {/* Two soft fields and one accent wash, all pure CSS. Nothing here is
          an image request, so none of it delays the first paint on a phone. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-52 size-[38rem] rounded-full blur-3xl"
        style={{ backgroundColor: withAlpha(primaryColor, fieldIsDark ? 0.35 : 0.16) }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-56 -left-32 size-[30rem] rounded-full blur-3xl"
        style={{ backgroundColor: withAlpha(accent, fieldIsDark ? 0.24 : 0.14) }}
      />

      <div className="relative mx-auto max-w-6xl px-5 pb-14 pt-7 sm:px-8 sm:pb-20 sm:pt-9">
        {/* The logo, at width. A wide lockup gets to be wide. */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={businessName}
              width={420}
              height={140}
              priority
              className="h-14 w-auto max-w-[260px] object-contain sm:h-20 sm:max-w-[380px]"
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

        <div className="mt-10 grid items-center gap-10 lg:mt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div>
            <h1
              className="text-[2.15rem] font-bold leading-[1.07] tracking-tight font-[family-name:var(--font-anchor-serif)] sm:text-5xl lg:text-[3.4rem]"
              style={{ color: onField }}
            >
              {headline}
            </h1>
            {subheadline && (
              <p className="mt-5 max-w-xl text-base leading-relaxed opacity-80 sm:text-lg" style={{ color: onField }}>
                {subheadline}
              </p>
            )}

            {/* The two doors. Equal weight, because the whole point is that
                this business does not have a primary and a secondary. The
                accent edges the shop door so the pair reads as two choices
                rather than a button and its afterthought. */}
            <div className={`mt-8 grid gap-3 ${shopHref ? "sm:grid-cols-2" : ""}`}>
              <a
                href={ctaHref}
                className="flex flex-col gap-0.5 rounded-2xl px-5 py-4 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
                style={{ backgroundColor: primaryColor, color: onPrimary }}
              >
                <span className="text-base font-semibold">{ctaLabel}</span>
                <span className="text-xs opacity-85">
                  {contactBlurb ?? "Tell us what you need and we will come back to you."}
                </span>
              </a>

              {shopHref && (
                <a
                  href={shopHref}
                  className="flex flex-col gap-0.5 rounded-2xl border-2 px-5 py-4 transition hover:-translate-y-0.5"
                  style={{
                    borderColor: accent,
                    color: onField,
                    backgroundColor: withAlpha(accent, fieldIsDark ? 0.16 : 0.1),
                  }}
                >
                  <span className="text-base font-semibold">Shop the products</span>
                  <span className="text-xs opacity-80">
                    {shopBlurb ?? "Browse everything we stock and order online."}
                  </span>
                </a>
              )}
            </div>

            {/* A number you can actually tap, above the fold.
                Growth's lead form deliberately holds every phone number back
                until somebody submits it (Combined spec Sec 20), and the
                Growth Build Kit asks the opposite for a done-for-you build.
                Both are defensible, so this resolves it in the only place
                that changes nothing for anybody else: one template, which no
                existing member is on. */}
            {(callPhone || whatsappPhone) && (
              <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" style={{ color: onField }}>
                {callPhone && (
                  <a
                    href={`tel:${callPhone.replace(/\s+/g, "")}`}
                    className="font-semibold underline-offset-4 hover:underline"
                  >
                    Call {callPhone}
                  </a>
                )}
                {whatsappPhone && (
                  <a
                    href={whatsAppLink(whatsappPhone)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold underline-offset-4 hover:underline"
                    style={{ color: accent }}
                  >
                    WhatsApp
                  </a>
                )}
              </p>
            )}
          </div>

          {/* The image panel. Deliberately not a full-bleed background:
              a background photo behind text needs a scrim, and a scrim over
              somebody's only good photo wastes it. Offset and framed instead,
              so the picture is looked at rather than darkened. */}
          {photoUrl && (
            <div className="relative hidden lg:block">
              <div
                aria-hidden
                className="absolute -left-5 -top-5 h-full w-full rounded-[2rem] border-2"
                style={{ borderColor: withAlpha(accent, 0.55) }}
              />
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] shadow-2xl">
                <Image
                  src={photoUrl}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 0px, 42vw"
                  priority
                  className="object-cover"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* A hairline in the accent, so the hero ends on the third colour
          rather than dissolving into the section below it. */}
      <div aria-hidden className="h-1 w-full" style={{ backgroundColor: accent }} />
    </header>
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
 * A South African number as wa.me wants it.
 *
 * Members type "076 272 1334", and wa.me needs the full international form
 * with no spaces or plus.
 */
function whatsAppLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const international = digits.startsWith("0") ? `27${digits.slice(1)}` : digits;
  return `https://wa.me/${international}`;
}

