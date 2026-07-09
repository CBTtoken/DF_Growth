"use client";

import { useActionState } from "react";
import { captureLead } from "@/app/g/[clientSlug]/actions";

export function LeadForm({
  growthClientId,
  landingPageId,
  pageUrl,
  primaryColor,
}: {
  growthClientId: string;
  landingPageId: string;
  pageUrl: string;
  primaryColor: string;
}) {
  const boundAction = captureLead.bind(null, growthClientId, landingPageId, pageUrl);
  const [state, formAction, pending] = useActionState(boundAction, null);

  if (state?.success) {
    return (
      <section id="lead-form" className="flex flex-col items-center gap-2 px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Thanks — we&apos;ll be in touch shortly</h2>
      </section>
    );
  }

  return (
    <section id="lead-form" className="flex flex-col items-center gap-2 bg-gray-50 px-4 py-20">
      <h2 className="text-2xl font-bold text-gray-900">Get in touch</h2>
      <p className="mb-4 text-sm text-gray-500">We&apos;ll respond within one business day.</p>
      <form action={formAction} className="flex w-full max-w-sm flex-col gap-3">
        <input
          type="text"
          name="name"
          placeholder="Your name"
          required
          className="rounded-full border border-gray-300 bg-white px-5 py-3 text-sm shadow-sm outline-none focus:border-gray-400"
        />
        {state?.error?.name && <p className="text-xs text-red-600">{state.error.name[0]}</p>}

        <input
          type="email"
          name="email"
          placeholder="you@example.com"
          required
          className="rounded-full border border-gray-300 bg-white px-5 py-3 text-sm shadow-sm outline-none focus:border-gray-400"
        />
        {state?.error?.email && <p className="text-xs text-red-600">{state.error.email[0]}</p>}

        <input
          type="tel"
          name="phone"
          placeholder="Phone (optional)"
          className="rounded-full border border-gray-300 bg-white px-5 py-3 text-sm shadow-sm outline-none focus:border-gray-400"
        />

        {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-full px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-50"
          style={{ backgroundColor: primaryColor }}
        >
          {pending ? "Sending..." : "Send"}
        </button>
      </form>
    </section>
  );
}
