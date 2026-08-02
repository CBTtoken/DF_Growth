import { readableTextOn, shade, withAlpha } from "@/lib/color";
import { HeroBrandBar } from "./HeroBrandBar";

/**
 * "Dual Offer": a hero for a business that genuinely does two things.
 *
 * Every other hero in this library presents one call to action, which is the
 * right answer when a business does one thing. It is the wrong answer for
 * the member this was built for, who organises events and networking and
 * also sells the products she believes in. Funnelling both of those into a
 * single "Get in touch" button loses whichever half the visitor came for.
 *
 * So the hero ends in two doors rather than one, side by side and equal in
 * weight, each with a line saying what is behind it. The second door is the
 * shop, and it appears only when the member actually has products, using the
 * same `shopHref` the brand bar already receives. A member on this template
 * with no shop gets a single, full-width call to action and the layout still
 * reads as finished rather than as a missing box.
 *
 * Reusable well beyond one client: a salon that sells product, a coach who
 * runs workshops and sells courses, a farm with a shop and a venue.
 *
 * Warm and organic on purpose, to sit apart from the geometric and dark
 * anchors: a soft tinted field, generous space, and a serif heading.
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
  /** One line under the shop door. Falls back to something neutral. */
  shopBlurb?: string;
  /** One line under the contact door. Falls back to something neutral. */
  contactBlurb?: string;
  callPhone?: string | null;
  whatsappPhone?: string | null;
}) {
  // The field behind the hero is the member's own secondary colour, lightly
  // tinted with their primary rather than a fixed palette, so two members on
  // this template never look like each other.
  const textColor = readableTextOn(secondaryColor);
  const glow = withAlpha(primaryColor, 0.14);
  const deep = shade(primaryColor, -0.15);
  const onPrimary = readableTextOn(primaryColor);

  return (
    <header id="top" className="relative overflow-hidden" style={{ backgroundColor: secondaryColor }}>
      {/* Two soft fields rather than a hard band. Pure CSS, no image and no
          script, so nothing here delays the first paint on a phone. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-40 size-[34rem] rounded-full blur-3xl"
        style={{ backgroundColor: glow }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -left-24 size-[28rem] rounded-full blur-3xl"
        style={{ backgroundColor: glow }}
      />

      <div className="relative mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-6 sm:px-8">
        <HeroBrandBar
          businessName={businessName}
          logoUrl={logoUrl}
          facebookUrl={facebookUrl}
          instagramUrl={instagramUrl}
          websiteUrl={websiteUrl}
          textColor={textColor}
          shopHref={shopHref}
        />
      </div>

      <div className="relative mx-auto max-w-5xl px-5 pb-16 pt-6 sm:px-8 sm:pb-24 sm:pt-10">
        {/* Asymmetric rather than centred: the headline sits left and stops
            well short of the right edge, which is what stops a long line
            reading as a wall on a laptop and keeps it honest on a phone. */}
        <div className="max-w-2xl">
          {/* The serif this template's anchor sets. Named directly rather
              than threaded through heroProps, because this hero is only ever
              rendered by the one anchor that defines it, and every other
              hero in the library uses the body sans. The variable is put on
              <main> by ClientLandingPageView, so if an anchor ever stopped
              setting it this degrades to the body font rather than breaking. */}
          <h1
            className="text-4xl font-bold leading-[1.08] tracking-tight font-[family-name:var(--font-anchor-serif)] sm:text-6xl"
            style={{ color: textColor }}
          >
            {headline}
          </h1>
          {subheadline && (
            <p className="mt-5 max-w-xl text-lg leading-relaxed opacity-80" style={{ color: textColor }}>
              {subheadline}
            </p>
          )}
        </div>

        {/* The two doors. Equal weight, because the whole point is that this
            business does not have a primary and a secondary. */}
        <div className={`mt-10 grid gap-4 ${shopHref ? "sm:grid-cols-2" : ""}`}>
          <a
            href={ctaHref}
            className="group flex flex-col gap-1 rounded-2xl px-6 py-5 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
            style={{ backgroundColor: primaryColor, color: onPrimary }}
          >
            <span className="text-lg font-semibold">{ctaLabel}</span>
            <span className="text-sm opacity-85">
              {contactBlurb ?? "Tell us what you need and we will come back to you."}
            </span>
          </a>

          {shopHref && (
            <a
              href={shopHref}
              className="group flex flex-col gap-1 rounded-2xl border-2 px-6 py-5 transition hover:-translate-y-0.5"
              style={{ borderColor: deep, color: textColor, backgroundColor: withAlpha(secondaryColor, 0.6) }}
            >
              <span className="text-lg font-semibold">Shop the products</span>
              <span className="text-sm opacity-75">
                {shopBlurb ?? "Browse everything we stock and order online."}
              </span>
            </a>
          )}
        </div>

        {/* A number you can actually tap, above the fold.
            Growth's lead form deliberately holds every phone number back
            until somebody has submitted it (Combined spec Sec 20), which is
            the right trade for a business that wants leads captured. The
            Growth Build Kit asks the opposite for a done-for-you build: a
            contact action visible without scrolling that works when tapped.
            Both are defensible, so this resolves it in the only place that
            changes nothing for anybody else: here, in one template, which no
            existing member is on. Every other template still behaves exactly
            as it did. */}
        {(callPhone || whatsappPhone) && (
          <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" style={{ color: textColor }}>
            {callPhone && (
              <a href={`tel:${callPhone.replace(/\s+/g, "")}`} className="font-semibold underline-offset-4 hover:underline">
                Call {callPhone}
              </a>
            )}
            {whatsappPhone && (
              <a
                href={whatsAppLink(whatsappPhone)}
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline-offset-4 hover:underline"
              >
                WhatsApp
              </a>
            )}
          </p>
        )}
      </div>
    </header>
  );
}

/**
 * A South African number as wa.me wants it.
 *
 * Members type "076 272 1334", and wa.me needs the full international form
 * with no spaces or plus. Same conversion the lead form already does, kept
 * local rather than exported from there because that one lives inside a
 * client component this server hero cannot import from.
 */
function whatsAppLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const international = digits.startsWith("0") ? `27${digits.slice(1)}` : digits;
  return `https://wa.me/${international}`;
}
