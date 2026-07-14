"use client";

import { useActionState } from "react";
import { submitHomepageInquiry } from "@/app/pricing/get-in-touch-actions";

// Public Beta Polish Sprint Sec 5: the marketing homepage's own "Get in
// Touch" block, distinct from any client page's lead form — this is a
// question about DigitalFlyer itself (not routed to any business), so it
// posts to submitHomepageInquiry rather than captureLead.
export function GetInTouchSection() {
  const [state, formAction, pending] = useActionState(submitHomepageInquiry, null);

  return (
    <section className="bg-white px-6 py-16">
      <div className="mx-auto max-w-xl">
        <div className="rounded-3xl border border-gray-100 bg-gray-50 p-6 shadow-sm sm:p-10">
          {state?.success ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span
                aria-hidden
                className="grid size-12 place-items-center rounded-full bg-brand/10 text-2xl text-brand"
              >
                ✓
              </span>
              <h2 className="mt-2 text-2xl font-bold text-gray-900">Thanks for reaching out!</h2>
              <p className="max-w-md text-gray-500">We&apos;ll be in touch shortly.</p>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl uppercase tracking-wide text-ink">Get In Touch</h2>
              <p className="mt-2 text-gray-500">Questions about DigitalFlyer? We&apos;ll respond within one business day.</p>

              <form action={formAction} className="mt-8 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="gt-name" className="text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    id="gt-name"
                    type="text"
                    name="name"
                    required
                    placeholder="Your name"
                    className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-gray-900 outline-none transition-colors placeholder:text-gray-400"
                  />
                  {state?.error?.name && <p className="text-xs text-red-600">{state.error.name[0]}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="gt-email" className="text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    id="gt-email"
                    type="email"
                    name="email"
                    required
                    placeholder="you@example.com"
                    className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-gray-900 outline-none transition-colors placeholder:text-gray-400"
                  />
                  {state?.error?.email && <p className="text-xs text-red-600">{state.error.email[0]}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="gt-phone" className="text-sm font-medium text-gray-700">
                    Phone <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    id="gt-phone"
                    type="tel"
                    name="phone"
                    placeholder="Phone number"
                    className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-gray-900 outline-none transition-colors placeholder:text-gray-400"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="gt-message" className="text-sm font-medium text-gray-700">
                    Message <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    id="gt-message"
                    name="message"
                    rows={3}
                    placeholder="What would you like to know?"
                    className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition-colors placeholder:text-gray-400"
                  />
                </div>

                {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}

                <button
                  type="submit"
                  disabled={pending}
                  className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-brand px-7 py-3.5 text-base font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50"
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
