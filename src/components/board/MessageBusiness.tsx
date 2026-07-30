"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { MessageSquareText, Send } from "lucide-react";
import { requestBoardCode, sendPublicMessage } from "@/app/board/chat-actions";
import { verifyBoardOtp } from "@/app/board/actions";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";

// Growth Chat, the button on a post.
//
// It sits next to the WhatsApp button rather than replacing it, which is
// section 6 of the handoff: both paths stay live, side by side, and usage
// decides which wins. A person who would rather use WhatsApp taps WhatsApp,
// and nothing here nags them about it.
//
// The typed message stays in this component while the code is verified, so
// nothing unverified is ever written to the database, and the person does
// not have to type it twice.
const inputClass =
  "w-full rounded-xl border border-neutral-border bg-white px-3.5 py-2.5 text-sm text-neutral-ink outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";

export function MessageBusiness({
  growthClientId,
  postId,
  businessName,
}: {
  growthClientId: string;
  postId: string;
  businessName: string;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");

  const [sendState, sendAction, sendPending] = useActionState(
    sendPublicMessage.bind(null, growthClientId, postId),
    null
  );
  const [codeState, codeAction, codePending] = useActionState(requestBoardCode, null);
  const [otpState, otpAction, otpPending] = useActionState(verifyBoardOtp.bind(null, ""), null);

  const needsIdentity = Boolean(sendState?.needsIdentity) && !otpState?.success;
  const awaitingCode = Boolean(codeState?.needsCode) && !otpState?.success;

  if (sendState?.sent) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        Sent to {businessName}. They get an email straight away, and their reply lands in{" "}
        <Link href="/board/messages" className="font-semibold underline underline-offset-2">
          your messages
        </Link>
        .
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-brand-blue/30 bg-white px-4 py-2.5 text-sm font-semibold text-brand-blue transition-colors hover:bg-brand-blue-light"
      >
        <MessageSquareText size={15} />
        Message here instead
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-border bg-white p-4">
      <p className="text-sm font-semibold text-neutral-ink">Message {businessName}</p>

      {/* The message itself, always visible, so the person is never asked to
          verify before they know what they want to say. */}
      <form action={sendAction} className="flex flex-col gap-3">
        <textarea
          name="body"
          rows={3}
          required
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Hello, is this still available?"
          className={inputClass}
        />
        {sendState?.error && <p className="text-xs text-red-600">{sendState.error}</p>}
        {!needsIdentity && !awaitingCode && (
          <button
            type="submit"
            disabled={sendPending}
            className="inline-flex items-center gap-2 self-start rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
          >
            <Send size={15} />
            {sendPending ? "Sending..." : "Send"}
          </button>
        )}
      </form>

      {needsIdentity && !awaitingCode && (
        <form action={codeAction} className="flex flex-col gap-3 border-t border-neutral-border pt-3">
          <p className="text-sm text-neutral-mid">
            One quick step, so {businessName} knows you are a real person. No password and no account.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input type="text" name="displayName" required placeholder="Your name" className={inputClass} />
            <input type="email" name="email" required placeholder="Your email" className={inputClass} />
          </div>
          <TurnstileWidget />
          {codeState?.error && <p className="text-xs text-red-600">{codeState.error}</p>}
          <button
            type="submit"
            disabled={codePending}
            className="self-start rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
          >
            {codePending ? "Sending the code..." : "Send me a code"}
          </button>
        </form>
      )}

      {awaitingCode && (
        <form action={otpAction} className="flex flex-col gap-3 border-t border-neutral-border pt-3">
          <p className="text-sm text-neutral-mid">
            We sent a code to {codeState?.email}. Enter it, then press send again and your message goes
            through.
          </p>
          <input type="hidden" name="email" value={codeState?.email ?? ""} />
          <input
            type="text"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            placeholder="Code from your email"
            className={inputClass}
          />
          {otpState?.error && <p className="text-xs text-red-600">{otpState.error}</p>}
          <button
            type="submit"
            disabled={otpPending}
            className="self-start rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
          >
            {otpPending ? "Checking..." : "Verify"}
          </button>
        </form>
      )}

      {otpState?.success && !sendState?.sent && (
        <p className="text-xs text-emerald-700">Verified. Press Send and it goes to {businessName}.</p>
      )}
    </div>
  );
}
