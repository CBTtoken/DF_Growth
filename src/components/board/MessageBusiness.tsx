"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { MessageSquareText, Send } from "lucide-react";
import { sendPublicMessage } from "@/app/board/chat-actions";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";

// Messaging a business. One screen, one send.
//
// It sits next to the WhatsApp button rather than replacing it: both paths
// stay live and usage decides which wins. Somebody who would rather use
// WhatsApp taps WhatsApp, and nothing here argues with them.
//
// No code, no second step. The email is where the reply goes, and that is
// the only check there is: a made-up address means no reply.
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
  const [state, formAction, pending] = useActionState(sendPublicMessage.bind(null, growthClientId, postId), null);

  if (state?.sent) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        Sent to {businessName}. They get an email straight away, and their reply comes back to you by email with a link
        to the conversation. You can also find it under{" "}
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
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-neutral-border bg-white p-4">
      <p className="text-sm font-semibold text-neutral-ink">Message {businessName}</p>

      <textarea
        name="body"
        rows={3}
        required
        placeholder="Hello, is this still available?"
        className={inputClass}
      />

      {/* The boxes always show. Working out who this is on the server would
          mean reading a cookie, and a cookie read turns this statically
          cached post page into a per-request render, which is the one thing
          the SEO case cannot afford. The server still recognises a returning
          sender by their address, so they keep one thread rather than many. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <input type="text" name="displayName" required placeholder="Your name" className={inputClass} />
        <input type="email" name="email" required placeholder="Your email" className={inputClass} />
      </div>
      <p className="text-xs text-neutral-muted">
        Your email is where their reply goes. It is never shown on the page.
      </p>
      <TurnstileWidget />

      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 self-start rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
      >
        <Send size={15} />
        {pending ? "Sending..." : "Send"}
      </button>
    </form>
  );
}
