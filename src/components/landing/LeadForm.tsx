"use client";

import { useActionState } from "react";
import { captureLead } from "@/app/g/[clientSlug]/actions";

export function LeadForm({
  growthClientId,
  landingPageId,
  primaryColor,
}: {
  growthClientId: string;
  landingPageId: string;
  primaryColor: string;
}) {
  const boundAction = captureLead.bind(null, growthClientId, landingPageId);
  const [state, formAction, pending] = useActionState(boundAction, null);

  if (state?.success) {
    return (
      <section id="lead-form" className="flex flex-col items-center gap-2 px-4 py-16 text-center">
        <h2 className="text-xl font-semibold">Thanks — we&apos;ll be in touch shortly</h2>
      </section>
    );
  }

  return (
    <section id="lead-form" className="flex flex-col items-center gap-4 px-4 py-16">
      <h2 className="text-xl font-semibold">Get in touch</h2>
      <form action={formAction} className="flex w-full max-w-sm flex-col gap-3">
        <input
          type="text"
          name="name"
          placeholder="Your name"
          required
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
        {state?.error?.name && <p className="text-xs text-red-600">{state.error.name[0]}</p>}

        <input
          type="email"
          name="email"
          placeholder="you@example.com"
          required
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
        {state?.error?.email && <p className="text-xs text-red-600">{state.error.email[0]}</p>}

        <input
          type="tel"
          name="phone"
          placeholder="Phone (optional)"
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />

        {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: primaryColor }}
        >
          {pending ? "Sending..." : "Send"}
        </button>
      </form>
    </section>
  );
}
