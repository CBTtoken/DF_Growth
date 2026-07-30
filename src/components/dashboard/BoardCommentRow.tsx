"use client";

import { useActionState, useState } from "react";
import { CornerDownRight, EyeOff, FileText } from "lucide-react";
import {
  createQuoteFromComment,
  memberReportComment,
  replyToCommentAsBusiness,
} from "@/app/dashboard/board/comment-actions";

// One comment on the member's own post, with the only two things he can do
// about it. Quote it, or get it out of public view.
//
// The quote button is the whole argument for building the board inside a
// business that already has an invoicing product. A comment asking what
// something costs is one tap away from a real priced document sent from the
// member's own number.
export function BoardCommentRow({
  commentId,
  postTitle,
  postSlug,
  authorName,
  body,
  createdAt,
  status,
}: {
  commentId: string;
  postTitle: string;
  postSlug: string;
  authorName: string;
  body: string;
  createdAt: string;
  status: string;
}) {
  const [quoteState, quoteAction, quotePending] = useActionState(createQuoteFromComment.bind(null, commentId), null);
  const [replyState, replyAction, replyPending] = useActionState(
    replyToCommentAsBusiness.bind(null, commentId),
    null
  );
  const [replying, setReplying] = useState(false);
  const held = status !== "published";

  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-ink">
          {authorName}
          <span className="ml-2 font-normal text-gray-400">
            on {postTitle}
            {held ? " · not public" : ""}
          </span>
        </p>
        <span className="text-xs text-gray-400">
          {new Date(createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
        </span>
      </div>

      <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">{body}</p>

      {quoteState?.error && <p className="text-xs text-red-600">{quoteState.error}</p>}

      {/* Answering in public, which was missing entirely. A customer asking
          what something costs used to get silence in public, or a private
          quote, and neither is what a board is for. */}
      {replyState?.success ? (
        <p className="text-xs text-emerald-700">Replied, and it is on the post now.</p>
      ) : replying && !held ? (
        <form action={replyAction} className="flex flex-col gap-2">
          <textarea
            name="body"
            rows={2}
            required
            maxLength={1000}
            placeholder="Answer them here, and it appears under their comment as the business."
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          {replyState?.error && <p className="text-xs text-red-600">{replyState.error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={replyPending}
              className="rounded-full bg-brand px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {replyPending ? "Posting..." : "Post reply"}
            </button>
            <button
              type="button"
              onClick={() => setReplying(false)}
              className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {!held && !replying && !replyState?.success && (
          <button
            type="button"
            onClick={() => setReplying(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 transition hover:border-brand/40 hover:text-brand"
          >
            <CornerDownRight size={14} /> Reply in public
          </button>
        )}
        <form action={quoteAction}>
          <button
            type="submit"
            disabled={quotePending}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            <FileText size={14} />
            {quotePending ? "Opening the quote..." : "Turn into a quote"}
          </button>
        </form>

        {!held && (
          <form action={memberReportComment.bind(null, commentId)}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 transition hover:border-red-300 hover:text-red-600"
            >
              <EyeOff size={14} /> Take it down
            </button>
          </form>
        )}

        <a
          href={`/board/post/${postSlug}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold text-gray-400 underline-offset-2 hover:text-brand hover:underline"
        >
          See the post
        </a>
      </div>

      {held && (
        <p className="text-xs text-gray-500">
          Out of public view and with us to check. You do not need to do anything else.
        </p>
      )}
    </li>
  );
}
