"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { sendGuestMessage, type GuestMessageState } from "@/app/[clientSlug]/stays-actions";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";
import { readableTextOn } from "@/lib/color";
import { STAY_COPY } from "@/lib/stays/copy";

/**
 * The way a guest reaches the member, offered after booking and never
 * before.
 *
 * Handoff Job 7. This is Growth Chat, the same inbox the member already
 * uses for the Board, so there is nothing for them to set up and no
 * WhatsApp Business number to buy. They get an email when a message lands
 * and reply inside Growth.
 *
 * Nothing about this component knows who the guest is. The booking's own
 * token is what identifies them, and the Server Action refuses any token
 * that is not attached to a confirmed booking with this member.
 */
export function GuestChat({
  clientSlug,
  token,
  businessName,
  accentColor,
}: {
  clientSlug: string;
  token: string;
  businessName: string;
  accentColor: string;
}) {
  const bound = sendGuestMessage.bind(null, clientSlug);
  const [state, action, pending] = useActionState<GuestMessageState, FormData>(bound, null);

  if (state?.sent) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-sm">
        <CheckCircle2 aria-hidden className="mx-auto mb-3 h-10 w-10 text-green-600" />
        <p className="text-base font-semibold text-gray-900">{STAY_COPY.chatSent}</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">{STAY_COPY.chatHeading}</h2>
        <p className="mt-1 text-sm leading-relaxed text-gray-600">{STAY_COPY.chatLead}</p>
      </div>

      <input type="hidden" name="token" value={token} />

      <textarea
        name="body"
        rows={4}
        required
        maxLength={2000}
        placeholder={STAY_COPY.chatPlaceholder}
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-gray-400"
      />

      <TurnstileWidget />

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-xl text-base font-semibold shadow-sm transition hover:-translate-y-0.5 disabled:opacity-60 sm:w-fit sm:px-10"
        style={{ backgroundColor: accentColor, color: readableTextOn(accentColor) }}
      >
        {pending ? "Sending" : `${STAY_COPY.chatSend} to ${businessName}`}
      </button>
    </form>
  );
}
