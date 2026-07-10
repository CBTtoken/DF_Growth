"use client";

import { useActionState } from "react";
import { captureLead } from "@/app/g/[clientSlug]/actions";
import { readableTextOn, ensureContrast } from "@/lib/color";

export function LeadForm({
  growthClientId,
  landingPageId,
  pageUrl,
  primaryColor,
  contactEmail,
  businessName,
}: {
  growthClientId: string;
  landingPageId: string;
  pageUrl: string;
  primaryColor: string;
  contactEmail: string | null;
  businessName: string;
}) {
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
              <h2 className="mt-2 text-2xl font-bold text-gray-900">You&apos;re in.</h2>
              <p className="max-w-md text-gray-500">
                Thanks for reaching out — someone will be in touch shortly.
                {contactEmail && " Need urgent assistance in the meantime?"}
              </p>
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="mt-1 text-sm font-semibold underline-offset-4 hover:underline"
                  style={{ color: primaryColor }}
                >
                  {contactEmail}
                </a>
              )}
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
