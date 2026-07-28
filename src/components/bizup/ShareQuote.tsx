"use client";

import { useActionState } from "react";
import Link from "next/link";
import { issueQuote, emailQuote } from "@/app/bizup/quotes/send-actions";

// BizUp/docs/bizup-phase1-spec.md Sec 9, sending.

const btn =
  "inline-flex items-center justify-center rounded-full px-5 py-3 text-base font-semibold shadow-sm transition disabled:opacity-50";

export function IssueQuoteButton({ documentId, ready }: { documentId: string; ready: boolean }) {
  const [state, action, pending] = useActionState(issueQuote, null);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="documentId" value={documentId} />
      <button type="submit" disabled={pending || !ready} className={`${btn} bg-brand text-white hover:bg-brand-dark`}>
        {pending ? "Issuing..." : "Issue this quote"}
      </button>
      {!ready && (
        <p className="text-xs text-gray-500">
          Add at least one line before issuing.
        </p>
      )}
      <p className="text-xs text-gray-500">
        This gives the quote its number and makes it shareable. You can keep editing until then.
      </p>
      {/* Sec 15: the cap is enforced here, at send. A member who has run out
          still has every draft intact, which is why this reads as a next
          step rather than a failure. */}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm font-medium text-green-700">{state.ok}</p>}
    </form>
  );
}

export function ShareQuote({
  documentId,
  whatsappUrl,
  publicUrl,
  defaultEmail,
}: {
  documentId: string;
  whatsappUrl: string;
  publicUrl: string;
  defaultEmail: string;
}) {
  const [state, action, pending] = useActionState(emailQuote, null);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-ink">Send it to your customer</h2>

      {/* Sec 9: a wa.me deep link, not the WhatsApp Business API. This opens
          the member's own WhatsApp so the message arrives from a number the
          customer recognises. Costs nothing and needs no Meta approval. */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btn} bg-[#25D366] text-white hover:brightness-95`}
      >
        Send on WhatsApp
      </a>

      <form action={action} className="flex flex-col gap-2">
        <input type="hidden" name="documentId" value={documentId} />
        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
          Or email it
          <input
            name="email"
            type="email"
            defaultValue={defaultEmail}
            placeholder="customer@example.co.za"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>
        <button type="submit" disabled={pending} className={`${btn} border border-gray-200 bg-white text-gray-700 hover:border-brand hover:text-brand`}>
          {pending ? "Sending..." : "Send by email"}
        </button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.ok && <p className="text-sm font-medium text-green-700">{state.ok}</p>}
      </form>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
        Or copy the link
        <input
          readOnly
          value={publicUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 outline-none"
        />
      </label>

      {/* Dewald: "once invoice is sent, it should either take them back
          home or ask if they complete and go back home". A way out, offered
          rather than forced: WhatsApp sending leaves the member on this
          page with nothing obviously finished, and the job is done at that
          point. Not an automatic redirect, because a member may want to
          send by email as well, or copy the link. */}
      <Link
        href="/bizup"
        className="text-center text-sm font-semibold text-brand underline-offset-2 hover:underline"
      >
        Done, back to home
      </Link>
    </div>
  );
}
