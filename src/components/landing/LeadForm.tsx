"use client";

import { useActionState } from "react";
import { captureLead } from "@/app/g/[clientSlug]/actions";
import { readableTextOn, ensureContrast } from "@/lib/color";

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
  businessName,
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
  businessName: string;
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
      <div className="mx-auto max-w-xl px-4 py-20 sm:px-8 sm:py-28">
        <div className="rounded-3xl bg-white p-6 shadow-xl shadow-black/10 sm:p-10">
          {state?.success ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
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
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Get in touch</h2>
              <p className="mt-2 text-gray-500">We&apos;ll respond within one business day.</p>

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

                {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}

                <button
                  type="submit"
                  disabled={pending}
                  className="mt-2 inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold shadow-lg transition hover:-translate-y-0.5 disabled:opacity-50"
                  style={{ backgroundColor: primaryColor, color: buttonTextColor }}
                >
                  {pending ? "Sending..." : "Send"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
