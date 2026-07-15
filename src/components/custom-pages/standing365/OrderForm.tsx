"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitBookOrder } from "@/components/custom-pages/standing365/actions";

// Real feedback: 300 read as too tight for a real personal message, and a
// gift message someone actually cares about getting right deserves the
// room. 500 still comfortably fits inside a printed front-cover page.
const GIFT_MESSAGE_LIMIT = 500;

// STANDING365_LANDING_BUILD_SPEC_CLAUDE.md Sec 5/10: opens inline below the
// chosen card rather than a separate page/modal — keeps the visitor in the
// same scroll position they were already reading. Loading state on submit
// (Paystack redirect prep) and disabled-while-pending per Sec 10.
export function OrderForm({
  edition,
  growthClientId,
  onClose,
}: {
  edition: "standard" | "personalised";
  growthClientId: string;
  onClose: () => void;
}) {
  const boundAction = submitBookOrder.bind(null, growthClientId, edition);
  const [state, formAction, pending] = useActionState(boundAction, null);
  const [giftMessage, setGiftMessage] = useState("");

  return (
    <div className="mt-4 rounded-2xl border border-[#B8832A]/30 bg-[#FBF8F3] p-6 text-left">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-[#16213E]">
          {edition === "personalised" ? "Personalised Paperback — your details" : "Standard Paperback — your details"}
        </h4>
        {/* Real feedback: this used to be faint, low-contrast text easy to
            miss entirely, reading as "there's no way back" once the form
            was open. A real bordered button with an explicit arrow reads
            unambiguously as a way out. */}
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 rounded-full border border-[#16213E]/20 px-3 py-1.5 text-xs font-semibold text-[#16213E] transition hover:border-[#16213E]/40 hover:bg-[#16213E]/5"
        >
          ← Back
        </button>
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <input
            name="buyerName"
            placeholder="Full name"
            required
            className="rounded-lg border border-[#16213E]/15 bg-white px-3 py-2.5 text-sm text-[#2E2A22] outline-none focus:border-[#B8832A]"
          />
          {state?.error?.buyerName && <p className="text-xs text-red-600">{state.error.buyerName[0]}</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <input
              type="email"
              name="email"
              placeholder="Email"
              required
              className="rounded-lg border border-[#16213E]/15 bg-white px-3 py-2.5 text-sm text-[#2E2A22] outline-none focus:border-[#B8832A]"
            />
            {state?.error?.email && <p className="text-xs text-red-600">{state.error.email[0]}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <input
              type="tel"
              name="phone"
              placeholder="Phone"
              required
              className="rounded-lg border border-[#16213E]/15 bg-white px-3 py-2.5 text-sm text-[#2E2A22] outline-none focus:border-[#B8832A]"
            />
            {state?.error?.phone && <p className="text-xs text-red-600">{state.error.phone[0]}</p>}
          </div>
        </div>

        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#2E2A22]/50">Delivery address</p>
        <div className="flex flex-col gap-1">
          <input
            name="street"
            placeholder="Street address"
            required
            className="rounded-lg border border-[#16213E]/15 bg-white px-3 py-2.5 text-sm text-[#2E2A22] outline-none focus:border-[#B8832A]"
          />
          {state?.error?.street && <p className="text-xs text-red-600">{state.error.street[0]}</p>}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            name="suburb"
            placeholder="Suburb"
            required
            className="rounded-lg border border-[#16213E]/15 bg-white px-3 py-2.5 text-sm text-[#2E2A22] outline-none focus:border-[#B8832A]"
          />
          <input
            name="city"
            placeholder="City"
            required
            className="rounded-lg border border-[#16213E]/15 bg-white px-3 py-2.5 text-sm text-[#2E2A22] outline-none focus:border-[#B8832A]"
          />
          <input
            name="postalCode"
            placeholder="Postal code"
            required
            className="rounded-lg border border-[#16213E]/15 bg-white px-3 py-2.5 text-sm text-[#2E2A22] outline-none focus:border-[#B8832A]"
          />
        </div>
        {(state?.error?.suburb || state?.error?.city || state?.error?.postalCode) && (
          <p className="text-xs text-red-600">Please fill in the full delivery address.</p>
        )}

        {edition === "personalised" && (
          <>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#2E2A22]/50">
              Personalisation
            </p>
            <div className="flex flex-col gap-1">
              <input
                name="recipientName"
                placeholder="Recipient's name (printed on the cover)"
                required
                className="rounded-lg border border-[#16213E]/15 bg-white px-3 py-2.5 text-sm text-[#2E2A22] outline-none focus:border-[#B8832A]"
              />
              {state?.error?.recipientName && <p className="text-xs text-red-600">{state.error.recipientName[0]}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <textarea
                name="giftMessage"
                placeholder="Personal message (printed inside the front cover)"
                required
                rows={3}
                maxLength={GIFT_MESSAGE_LIMIT}
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
                className="rounded-lg border border-[#16213E]/15 bg-white px-3 py-2.5 text-sm text-[#2E2A22] outline-none focus:border-[#B8832A]"
              />
              <p className="text-right text-xs text-[#2E2A22]/50">
                {giftMessage.length}/{GIFT_MESSAGE_LIMIT}
              </p>
              {state?.error?.giftMessage && <p className="text-xs text-red-600">{state.error.giftMessage[0]}</p>}
            </div>
          </>
        )}

        <p className="mt-2 text-xs leading-relaxed text-[#2E2A22]/60">
          We only use these details to process and ship this order — your delivery address and message are never
          shared or sold. See our full{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>

        <label className="mt-1 flex items-start gap-2 text-xs text-[#2E2A22]/80">
          <input type="checkbox" name="legalConsent" required className="mt-0.5" />
          <span>I agree to my details being used to process this order, in line with the Privacy Policy.</span>
        </label>
        <label className="flex items-start gap-2 text-xs text-[#2E2A22]/80">
          <input type="checkbox" name="marketingConsent" className="mt-0.5" />
          <span>Yes, keep me updated about Standing 365 and future books.</span>
        </label>

        {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 inline-flex items-center justify-center rounded-full bg-[#B8832A] px-6 py-3 text-sm font-semibold text-[#16213E] transition hover:-translate-y-0.5 hover:bg-[#D6A857] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Preparing checkout…" : "Continue to payment"}
        </button>
      </form>
    </div>
  );
}
