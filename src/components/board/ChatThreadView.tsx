"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import type { ChatMessage } from "@/lib/board/chat";

// One conversation, both sides, same component.
//
// The only difference between the member's view and the public one is which
// side counts as "me", so this takes that as a prop rather than existing
// twice. A message from the other person sits left and grey, yours sits
// right and blue, which is the shape everybody already understands from
// every other messaging app they use.
export function ChatThreadView({
  messages,
  side,
  otherName,
  action,
}: {
  messages: ChatMessage[];
  side: "public" | "member";
  otherName: string;
  action: (state: { error?: string; sent?: boolean } | null, formData: FormData) => Promise<{ error?: string; sent?: boolean } | null>;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {messages.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-border bg-white p-6 text-center text-sm text-neutral-muted">
            Nothing here yet.
          </p>
        ) : (
          messages.map((message) => {
            const mine = message.sender === side;
            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    mine ? "bg-brand-blue text-white" : "border border-neutral-border bg-white text-neutral-ink"
                  }`}
                >
                  <p className="whitespace-pre-line">{message.body}</p>
                  <p className={`mt-1 text-[11px] ${mine ? "text-white/70" : "text-neutral-muted"}`}>
                    {new Date(message.createdAt).toLocaleString("en-ZA", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form action={formAction} className="flex flex-col gap-2">
        <textarea
          name="body"
          rows={2}
          required
          placeholder={`Reply to ${otherName}`}
          className="w-full rounded-xl border border-neutral-border bg-white px-3.5 py-2.5 text-sm text-neutral-ink outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
        />
        {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
        {state?.sent && <p className="text-xs text-emerald-700">Sent. They get an email straight away.</p>}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 self-start rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
        >
          <Send size={15} />
          {pending ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
