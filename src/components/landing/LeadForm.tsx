"use client";

import { useActionState } from "react";
import { captureLead } from "@/app/[clientSlug]/actions";
import { TrackEvent } from "@/components/analytics/TrackEvent";
import { readableTextOn, ensureContrast } from "@/lib/color";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";

// South African cell numbers are typically entered locally ("082 123
// 4567"), but wa.me links need the full international number with no
// leading zero. Good enough for the common case without asking a
// non-technical client to type it in international format themselves.
function toWhatsAppLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const international = digits.startsWith("0") ? `27${digits.slice(1)}` : digits;
  return `https://wa.me/${international}`;
}

export function LeadForm({
  growthClientId,
  landingPageId,
  pageUrl,
  primaryColor,
  contactEmail,
  callPhone,
  whatsappPhone,
  websiteUrl,
  businessName,
  variant = "standard",
}: {
  growthClientId: string;
  landingPageId: string;
  pageUrl: string;
  primaryColor: string;
  contactEmail: string | null;
  callPhone: string | null;
  // Combined spec Sec 20: falls back to callPhone when left blank at
  // signup (matches the onboarding field's own "leave blank if it's the
  // same as your call number" hint) — a business with one number for both
  // shouldn't have to type it twice.
  whatsappPhone: string | null;
  // Public Beta Polish Sprint Sec 11: this is the client-facing use of
  // Website URL — shown alongside their other public contact details once
  // a lead form (or a package's "Enquire Now", which just scrolls here) is
  // submitted. Not to be confused with the separate, admin-only
  // Marketplace URL (EcosystemAccess.tsx), which is never shown to a
  // visitor at all.
  websiteUrl: string | null;
  businessName: string;
  /**
   * "event-enquiry" (the Marquee template) adds the questions an events
   * business needs answered before it can quote: event type, date, guest
   * count and venue. All optional, grouped under their own heading, and
   * composed into the lead's message server-side. Every other template
   * keeps the standard four fields.
   */
  variant?: "standard" | "event-enquiry";
}) {
  const effectiveWhatsapp = whatsappPhone || callPhone;
  const boundAction = captureLead.bind(null, growthClientId, landingPageId, pageUrl, businessName, contactEmail);
  const [state, formAction, pending] = useActionState(boundAction, null);
  const buttonTextColor = readableTextOn(primaryColor);
  // The success checkmark icon renders as text color on a near-white
  // (10%-alpha) tinted background — same unsafe-on-white pattern as the
  // rest of the page's non-hero sections.
  const iconColor = ensureContrast(primaryColor, "#ffffff");

  return (
    <section id="lead-form" className="scroll-mt-8" style={{ backgroundColor: primaryColor }}>
      <div className="mx-auto max-w-xl px-4 py-14 sm:px-8 sm:py-20">
        <div className="rounded-3xl bg-white p-6 shadow-xl shadow-black/10 sm:p-10">
          {state?.success ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <TrackEvent name="generate_lead" />
              <span
                aria-hidden
                className="grid size-12 place-items-center rounded-full text-2xl"
                style={{ backgroundColor: `${primaryColor}1a`, color: iconColor }}
              >
                ✓
              </span>
              {/* Combined spec Sec 21: warmer, specific confirmation copy,
                  and (Sec 20) this is the one and only place call/WhatsApp
                  numbers are ever shown on the page. */}
              <h2 className="mt-2 text-2xl font-bold text-gray-900">Thank you for reaching out!</h2>
              <p className="max-w-md text-gray-500">
                {businessName} will be in touch shortly.
                {(callPhone || effectiveWhatsapp) && " In the meantime, feel free to call or WhatsApp directly."}
              </p>
              <div className="mt-1 flex flex-col items-center gap-1">
                {callPhone && (
                  <a
                    href={`tel:${callPhone.replace(/\s+/g, "")}`}
                    className="text-sm font-semibold underline-offset-4 hover:underline"
                    style={{ color: primaryColor }}
                  >
                    Call {callPhone}
                  </a>
                )}
                {effectiveWhatsapp && (
                  <a
                    href={toWhatsAppLink(effectiveWhatsapp)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold underline-offset-4 hover:underline"
                    style={{ color: primaryColor }}
                  >
                    WhatsApp {effectiveWhatsapp}
                  </a>
                )}
                {contactEmail && (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="text-sm font-semibold underline-offset-4 hover:underline"
                    style={{ color: primaryColor }}
                  >
                    {contactEmail}
                  </a>
                )}
                {websiteUrl && (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold underline-offset-4 hover:underline"
                    style={{ color: primaryColor }}
                  >
                    Visit website
                  </a>
                )}
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                {variant === "event-enquiry" ? "Request a quote" : "Get in touch"}
              </h2>
              <p className="mt-2 text-gray-500">
                {variant === "event-enquiry"
                  ? "Tell us about your event and we will come back with a quote to suit it. Only your name and email are needed; the rest helps us quote accurately."
                  : "We'll respond within one business day."}
              </p>

              <form action={formAction} className="mt-8 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    required
                    placeholder="Your name"
                    className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-gray-900 outline-none transition-colors placeholder:text-gray-400"
                  />
                  {state?.error?.name && <p className="text-xs text-red-600">{state.error.name[0]}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    required
                    placeholder="you@example.com"
                    className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-gray-900 outline-none transition-colors placeholder:text-gray-400"
                  />
                  {state?.error?.email && <p className="text-xs text-red-600">{state.error.email[0]}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="phone" className="text-sm font-medium text-gray-700">
                    Phone <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    placeholder="Phone number"
                    className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-gray-900 outline-none transition-colors placeholder:text-gray-400"
                  />
                </div>

                {variant === "event-enquiry" && (
                  <fieldset className="mt-2 flex flex-col gap-4 border-t border-gray-100 pt-4">
                    <legend className="sr-only">About your event</legend>
                    <p className="text-sm font-semibold text-gray-700">About your event</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="eventType" className="text-sm font-medium text-gray-700">
                          Type of event <span className="font-normal text-gray-400">(optional)</span>
                        </label>
                        <select
                          id="eventType"
                          name="eventType"
                          defaultValue=""
                          className="h-12 rounded-xl border border-gray-300 bg-white px-3 text-gray-900 outline-none transition-colors"
                        >
                          <option value="">Choose one</option>
                          <option>Wedding</option>
                          <option>Corporate event</option>
                          <option>Festival</option>
                          <option>Golf day</option>
                          <option>Private party</option>
                          <option>Family or school event</option>
                          <option>Something else</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="eventDate" className="text-sm font-medium text-gray-700">
                          Event date <span className="font-normal text-gray-400">(optional)</span>
                        </label>
                        <input
                          id="eventDate"
                          type="date"
                          name="eventDate"
                          className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-gray-900 outline-none transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="guests" className="text-sm font-medium text-gray-700">
                          Number of guests <span className="font-normal text-gray-400">(optional)</span>
                        </label>
                        <input
                          id="guests"
                          type="number"
                          inputMode="numeric"
                          min="1"
                          name="guests"
                          placeholder="How many people"
                          className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-gray-900 outline-none transition-colors placeholder:text-gray-400"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="eventLocation" className="text-sm font-medium text-gray-700">
                          Venue or area <span className="font-normal text-gray-400">(optional)</span>
                        </label>
                        <input
                          id="eventLocation"
                          type="text"
                          name="eventLocation"
                          placeholder="Where it happens"
                          className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-gray-900 outline-none transition-colors placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                  </fieldset>
                )}

                {/* Public Beta Polish Sprint Sec 5: extends this same form
                    with a message field rather than deploying a second,
                    near-identical "Get in Touch" block on top of it — this
                    form is already titled "Get in touch". */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="message" className="text-sm font-medium text-gray-700">
                    {variant === "event-enquiry" ? "Tell us about your event" : "Message"}{" "}
                    <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={3}
                    placeholder={
                      variant === "event-enquiry"
                        ? "The occasion, the style you have in mind, anything that matters"
                        : "Anything you'd like them to know"
                    }
                    className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition-colors placeholder:text-gray-400"
                  />
                </div>

                {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}

                {/* Invisible unless Cloudflare wants a closer look, so an ordinary
                    person never sees anything. */}
                <TurnstileWidget />
                <button
                  type="submit"
                  disabled={pending}
                  className="mt-2 inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold shadow-lg transition hover:-translate-y-0.5 disabled:opacity-50"
                  style={{ backgroundColor: primaryColor, color: buttonTextColor }}
                >
                  {pending ? "Sending..." : variant === "event-enquiry" ? "Request my quote" : "Send"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
