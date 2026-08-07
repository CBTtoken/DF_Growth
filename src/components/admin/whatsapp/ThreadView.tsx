"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  sendReply,
  sendSavedAnswer,
  sendNudge,
  retrySend,
  markThreadRead,
  type ActionResult,
} from "@/app/admin/whatsapp/actions";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";

export type ThreadMessage = {
  id: string;
  direction: "in" | "out";
  kind: string;
  body: string | null;
  status: string;
  error_detail: string | null;
  sent_by: string | null;
  created_at: string;
};

export type ThreadSavedAnswer = {
  id: string;
  group_slug: string;
  button_label: string;
  body: string;
};

const GROUP_HEADINGS: Record<string, string> = {
  member: "Member support",
  join: "Joining",
  job: "Job requests",
  general: "General",
};

const OUT_STATUS_LABEL: Record<string, string> = {
  queued: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
};

// The live half of the thread screen: the message bubbles, the nudge
// offer, and the composer with the saved answer picker. The window state
// and nudge eligibility are computed server-side and re-checked inside
// every action, so a stale page can never send something the rules
// forbid.
export function ThreadView({
  conversationId,
  messages,
  savedAnswers,
  windowOpen,
  nudgeEligible,
  nudgeText,
}: {
  conversationId: string;
  messages: ThreadMessage[];
  savedAnswers: ThreadSavedAnswer[];
  windowOpen: boolean;
  nudgeEligible: boolean;
  nudgeText: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [replyState, replyAction, replyPending] = useActionState<ActionResult, FormData>(
    sendReply.bind(null, conversationId),
    null
  );
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Opening the thread clears its unread badge, once.
  useEffect(() => {
    startTransition(() => markThreadRead(conversationId));
  }, [conversationId]);

  // A sent reply clears the box; a failed one leaves the text alone so
  // nothing typed is ever lost.
  useEffect(() => {
    if (replyState?.ok) formRef.current?.reset();
  }, [replyState]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const run = (action: () => Promise<ActionResult>) => {
    setActionMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result && !result.ok) setActionMessage(result.message);
      router.refresh();
    });
  };

  const busy = isPending || replyPending;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4">
        {messages.length === 0 && <p className="text-sm text-gray-400">No messages stored yet.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                m.direction === "out"
                  ? m.status === "failed"
                    ? "rounded-br-md border border-red-200 bg-red-50 text-gray-800"
                    : "rounded-br-md bg-brand/10 text-gray-800"
                  : "rounded-bl-md bg-gray-100 text-gray-800"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.body ?? `[${m.kind}]`}</p>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-gray-400">
                {new Date(m.created_at).toLocaleString()}
                {m.direction === "out" && m.sent_by === "system" && <span className="font-semibold">· Auto</span>}
                {m.direction === "out" && m.status !== "failed" && (
                  <span>· {OUT_STATUS_LABEL[m.status] ?? m.status}</span>
                )}
                {m.status === "failed" && (
                  <span className="font-semibold text-red-600">
                    · Not delivered{m.error_detail ? `: ${m.error_detail}` : ""}
                  </span>
                )}
                {m.status === "failed" && m.kind === "text" && m.body && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => retrySend(m.id))}
                    className="font-semibold text-brand underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    Try again
                  </button>
                )}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {nudgeEligible && nudgeText && (
        <div className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">
            This thread has been quiet for 20 hours and the window is closing.
          </p>
          <p className="text-sm text-gray-700">
            Sending this question invites a reply, and a reply keeps the conversation open:
          </p>
          <p className="rounded-xl bg-white p-3 text-sm text-gray-800">{nudgeText}</p>
          <div>
            <Button type="button" size="md" disabled={busy} onClick={() => run(() => sendNudge(conversationId))}>
              Send the nudge
            </Button>
          </div>
        </div>
      )}

      {windowOpen ? (
        <div className="flex flex-col gap-2">
          {pickerOpen && (
            <div className="flex max-h-72 flex-col gap-3 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4">
              {savedAnswers.length === 0 && (
                <p className="text-sm text-gray-400">
                  No saved answers yet. Write them under Saved answers and they appear here.
                </p>
              )}
              {Object.entries(GROUP_HEADINGS).map(([group, heading]) => {
                const answers = savedAnswers.filter((a) => a.group_slug === group);
                if (answers.length === 0) return null;
                return (
                  <div key={group} className="flex flex-col gap-1.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{heading}</p>
                    {answers.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setPickerOpen(false);
                          run(() => sendSavedAnswer(conversationId, a.id));
                        }}
                        className="rounded-xl border border-gray-200 p-3 text-left transition hover:border-brand disabled:opacity-50"
                      >
                        <span className="block text-sm font-semibold text-gray-900">{a.button_label}</span>
                        <span className="mt-0.5 block text-xs text-gray-500">{a.body}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
          <form ref={formRef} action={replyAction} className="flex flex-col gap-2">
            <textarea
              name="body"
              rows={3}
              required
              placeholder="Type a reply..."
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" size="md" disabled={busy}>
                {replyPending ? "Sending..." : "Send"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="bg-white"
                disabled={busy}
                onClick={() => setPickerOpen((open) => !open)}
              >
                {pickerOpen ? "Hide saved answers" : "Saved answers"}
              </Button>
              <span className="text-xs text-gray-400">Tapping a saved answer sends it as written.</span>
            </div>
          </form>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-red-700">
            <StatusPill tone="danger">Window closed</StatusPill>
            A plain reply will not deliver.
          </p>
          <p className="mt-1.5 text-sm text-gray-700">
            WhatsApp only allows free replies within 24 hours of their last message. Reopening this conversation
            needs an approved message template, which is waiting on the number going live with Meta. If they message
            again, the window opens again on its own.
          </p>
        </div>
      )}

      {replyState && !replyState.ok && <p className="text-xs text-red-600">{replyState.message}</p>}
      {actionMessage && <p className="text-xs text-red-600">{actionMessage}</p>}
    </div>
  );
}
