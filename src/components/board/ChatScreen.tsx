"use client";

import { useActionState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { sendPublicMessage, replyAsPublic } from "@/app/board/chat-actions";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";
import type { ChatMessage } from "@/lib/board/chat";
import { toWhatsAppNumber } from "@/lib/bizup/whatsapp";

// The conversation itself, shaped like every messaging app anybody already
// uses: their messages on the left, yours on the right, and the box pinned
// to the bottom of the screen.
//
// A first-time sender fills in a name and an email above the box, once.
// After that the screen is only bubbles and a message box, which is the
// whole point of Dewald's correction: it should feel like WhatsApp, not
// like a contact form.
export function ChatScreen({
  growthClientId,
  businessName,
  threadId,
  messages,
  knownName,
  knownEmail,
  chatEnabled,
  whatsapp,
}: {
  growthClientId: string;
  businessName: string;
  threadId: string | null;
  messages: ChatMessage[];
  knownName: string | null;
  knownEmail: string | null;
  chatEnabled: boolean;
  whatsapp: string | null;
}) {
  const known = Boolean(knownName && knownEmail);

  // An existing conversation replies into itself. A new one opens a thread.
  const action = threadId
    ? replyAsPublic.bind(null, threadId)
    : sendPublicMessage.bind(null, growthClientId, null);
  const [state, formAction, pending] = useActionState(action, null);

  const waNumber = toWhatsAppNumber(whatsapp);

  return (
    <>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-2 px-4 py-4">
        {messages.length === 0 ? (
          <div className="my-auto flex flex-col items-center gap-2 py-10 text-center">
            <MessageCircle size={26} className="text-neutral-muted" />
            <p className="text-sm font-semibold text-neutral-ink">Say hello to {businessName}</p>
            <p className="max-w-xs text-sm text-neutral-muted">
              They get an email straight away, and their reply lands right here.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const mine = message.sender === "public";
            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    mine
                      ? "rounded-br-sm bg-brand-blue text-white"
                      : "rounded-bl-sm border border-neutral-border bg-white text-neutral-ink"
                  }`}
                >
                  <p className="whitespace-pre-line">{message.body}</p>
                  <p className={`mt-1 text-[11px] ${mine ? "text-white/70" : "text-neutral-muted"}`}>
                    {new Date(message.createdAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {state?.sent && (
          <p className="self-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Sent. Reload to see it.
          </p>
        )}
      </div>

      {/* Pinned to the bottom, like a keyboard bar. */}
      <div className="sticky bottom-0 border-t border-neutral-border bg-white px-4 py-3">
        <div className="mx-auto w-full max-w-2xl">
          {chatEnabled ? (
            <form action={formAction} className="flex flex-col gap-2">
              {!known && (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      name="displayName"
                      required
                      placeholder="Your name"
                      className="w-full rounded-full border border-neutral-border bg-white px-4 py-2.5 text-sm text-neutral-ink outline-none focus:border-brand-blue"
                    />
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="Your email, for their reply"
                      className="w-full rounded-full border border-neutral-border bg-white px-4 py-2.5 text-sm text-neutral-ink outline-none focus:border-brand-blue"
                    />
                  </div>
                  <TurnstileWidget />
                </>
              )}

              <div className="flex items-end gap-2">
                <textarea
                  name="body"
                  rows={1}
                  required
                  placeholder={`Message ${businessName}`}
                  className="max-h-32 w-full resize-y rounded-2xl border border-neutral-border bg-white px-4 py-2.5 text-sm text-neutral-ink outline-none focus:border-brand-blue"
                />
                <button
                  type="submit"
                  disabled={pending}
                  aria-label="Send"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
                >
                  <Send size={17} />
                </button>
              </div>

              {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
            </form>
          ) : (
            <p className="text-center text-sm text-neutral-mid">
              {businessName} is not taking messages here.
              {waNumber && (
                <>
                  {" "}
                  <a
                    href={`https://wa.me/${waNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-emerald-700 underline underline-offset-2"
                  >
                    Message them on WhatsApp
                  </a>
                  .
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
