"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteInquiry,
  markInquiryRead,
  replyToInquiry,
  setInquiryArchived,
  type ReplyState,
} from "@/app/admin/support/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";

export type SupportInquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  read: boolean;
  archived_at: string | null;
  replied_at: string | null;
  created_at: string;
};

export type SupportReply = {
  id: string;
  admin_email: string;
  body: string;
  created_at: string;
};

// One card owns everything that can be done to one enquiry: reply, mark
// read, archive, delete. It is a client component because two of those
// need something a plain server form cannot give — the reply needs to show
// whether the email actually sent, and delete needs a confirmation the
// admin cannot miss.
export function SupportInquiryCard({
  inquiry,
  replies,
}: {
  inquiry: SupportInquiry;
  replies: SupportReply[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, formAction, replyPending] = useActionState<ReplyState, FormData>(
    replyToInquiry.bind(null, inquiry.id),
    null
  );

  // The box is open for a particular number of replies-so-far. A sent
  // reply revalidates the page, the count goes up, and the box closes on
  // its own, so a successful reply cannot be sent twice by a second click
  // on a form that still looks unfinished. A failed send leaves the count
  // alone and the typed text where it is.
  const [openAtReplyCount, setOpenAtReplyCount] = useState<number | null>(null);
  const replyOpen = openAtReplyCount === replies.length;

  const busy = isPending || replyPending;

  return (
    <Card
      variant={inquiry.archived_at ? "default" : inquiry.read ? "default" : "elevated"}
      className={`flex flex-col gap-3 ${inquiry.archived_at ? "opacity-75" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex flex-wrap items-center gap-2 font-semibold text-gray-900">
            {inquiry.name}
            {!inquiry.read && <StatusPill tone="brand">Unread</StatusPill>}
            {inquiry.replied_at && <StatusPill tone="success">Replied</StatusPill>}
            {inquiry.archived_at && <StatusPill tone="neutral">Archived</StatusPill>}
          </p>
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-gray-500">
            <a href={`mailto:${inquiry.email}`} className="text-brand underline-offset-2 hover:underline">
              {inquiry.email}
            </a>
            {inquiry.phone && (
              <>
                <span aria-hidden>·</span>
                <a
                  href={`tel:${inquiry.phone.replace(/\s+/g, "")}`}
                  className="text-brand underline-offset-2 hover:underline"
                >
                  {inquiry.phone}
                </a>
              </>
            )}
          </p>
        </div>
        <span className="text-xs text-gray-400">{new Date(inquiry.created_at).toLocaleString()}</span>
      </div>

      {inquiry.message && (
        <p className="whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm text-gray-600">{inquiry.message}</p>
      )}

      {replies.map((reply) => (
        <div key={reply.id} className="rounded-xl border border-brand/20 bg-brand/5 p-4">
          <p className="text-xs font-semibold text-brand">
            You replied {new Date(reply.created_at).toLocaleString()} · {reply.admin_email}
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-gray-700">{reply.body}</p>
        </div>
      ))}

      {replyOpen && (
        <form action={formAction} className="flex flex-col gap-2">
          <textarea
            name="body"
            rows={5}
            required
            autoFocus
            placeholder={`Good day ${inquiry.name}, ...`}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <p className="text-xs text-gray-400">
            Sends from DigitalFlyer SA to {inquiry.email}. Replies come back to info@digitalflyer.co.za. Your greeting
            and sign-off are added automatically, so write only the message.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="md" disabled={replyPending}>
              {replyPending ? "Sending..." : "Send reply"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="bg-white"
              disabled={replyPending}
              onClick={() => setOpenAtReplyCount(null)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {state && (
        <p className={`text-xs ${state.ok ? "text-green-700" : "text-red-600"}`}>{state.message}</p>
      )}

      <div className="flex flex-wrap gap-3">
        {!replyOpen && (
          <Button type="button" size="sm" disabled={busy} onClick={() => setOpenAtReplyCount(replies.length)}>
            {inquiry.replied_at ? "Reply again" : "Reply"}
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="bg-white"
          disabled={busy}
          onClick={() =>
            startTransition(async () => {
              await markInquiryRead(inquiry.id, !inquiry.read);
              router.refresh();
            })
          }
        >
          {inquiry.read ? "Mark unread" : "Mark read"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="bg-white"
          disabled={busy}
          onClick={() =>
            startTransition(async () => {
              await setInquiryArchived(inquiry.id, !inquiry.archived_at);
              router.refresh();
            })
          }
        >
          {inquiry.archived_at ? "Move back to open" : "Archive"}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={busy}
          onClick={() => {
            if (
              !window.confirm(
                `This permanently deletes the enquiry from ${inquiry.name} and any replies to it. There is no undo. Archive it instead if you might want it later. Delete?`
              )
            ) {
              return;
            }
            startTransition(async () => {
              await deleteInquiry(inquiry.id);
              router.refresh();
            });
          }}
        >
          Delete
        </Button>
      </div>
    </Card>
  );
}
