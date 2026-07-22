import { HELPLIFT_BLUE, HELPLIFT_BLUE_DARK, HELPLIFT_LIME } from "./brand";
import { PARTNER_REFERRAL_URL } from "./brand";

// Sec 3 Partner/Referral, reworked per Dewald (2026-07-22): its own section
// at the very bottom of the page, explaining the real DigitalFlyer SA
// give-back partnership rather than the earlier generic "partner with us"
// wording. Every business that subscribes to DigitalFlyer through Helplift's
// referral link sends a donation straight back to Helplift — so the button
// is their genuine agent referral link.
export function PartnershipSection() {
  const href = PARTNER_REFERRAL_URL ?? "#lead-form";

  return (
    <section className="px-5 py-14 sm:px-8 sm:py-16" style={{ backgroundColor: "#FFFFFF" }}>
      <div
        className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl px-6 py-12 text-center text-white sm:px-12 sm:py-16"
        style={{ background: `linear-gradient(135deg, ${HELPLIFT_BLUE_DARK} 0%, ${HELPLIFT_BLUE} 100%)` }}
      >
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full" style={{ backgroundColor: `${HELPLIFT_LIME}2e`, filter: "blur(40px)" }} />

        <div className="relative mx-auto max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest backdrop-blur">
            In Partnership with DigitalFlyer SA
          </span>
          <h2 className="mt-5 font-[family-name:var(--font-helplift-heading)] text-3xl font-bold leading-tight tracking-tight text-balance sm:text-4xl">
            Grow your business, and give back
          </h2>
          <p className="mt-5 text-base leading-relaxed text-white/90 sm:text-lg">
            DigitalFlyer SA is a proud partner of Helplift Network. For every business that subscribes
            to their services through the link below, a donation goes straight back to Helplift
            Network Vaal Triangle. Get your own professional business page, and lift our community
            while you do it.
          </p>

          <a
            href={href}
            {...(PARTNER_REFERRAL_URL ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="mt-8 inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-bold shadow-sm transition hover:-translate-y-0.5"
            style={{ color: HELPLIFT_BLUE_DARK }}
          >
            Get started &amp; give back
          </a>
          <p className="mt-4 text-xs text-white/70">
            Your subscription supports Helplift at no extra cost to you.
          </p>
        </div>
      </div>
    </section>
  );
}
