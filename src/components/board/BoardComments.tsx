"use client";

import { useActionState, useState } from "react";
import { CornerDownRight, Flag, Heart, MessageSquare, Star } from "lucide-react";
import Link from "next/link";
import { submitComment, toggleLike, reportContent } from "@/app/board/actions";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";
import type { BoardComment } from "@/lib/board/engagement";

// Everything the public does on a post, and none of it leaves the screen.
//
// The old version asked for an email, sent a code, and made somebody go and
// fetch it. Dewald hit that wall himself and called it what it is. The
// evidence was already on this platform: the review flow asks for a
// password and has zero reviews after six weeks.
//
// So: a like is one tap and asks nothing. A comment asks a name. An email is
// an optional box for somebody who wants to be told when the business
// replies. The invisible Cloudflare check does the human proving.
//
// Comments arrive as a prop and are rendered into the HTML, never fetched
// from the browser, so they are real page content for a crawler.

const inputClass =
  "w-full rounded-xl border border-neutral-border bg-white px-3.5 py-2.5 text-sm text-neutral-ink outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";

function ReportLink({ targetType, targetId, postSlug }: { targetType: "post" | "comment"; targetId: string; postSlug: string }) {
  const [open, setOpen] = useState(false);
  const action = reportContent.bind(null, targetType, targetId, postSlug);
  const [state, formAction, pending] = useActionState(action, null);

  if (state?.success) return <span className="text-[11px] text-neutral-muted">Thanks, we will look at it.</span>;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[11px] text-neutral-muted transition-colors hover:text-red-600"
      >
        <Flag size={11} /> Report
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2">
      <textarea name="reason" rows={2} placeholder="What is wrong with it?" className={inputClass} />
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-neutral-ink px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Sending..." : "Send report"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-neutral-border px-3.5 py-1.5 text-xs font-semibold text-neutral-mid"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/**
 * One comment, and the box to answer it.
 *
 * Dewald posted a comment and found nobody could respond to it, which was
 * true: comments were a flat list with no way in. Replies are one level
 * deep, the way Facebook does it, and a reply to a reply lands beside it
 * rather than starting a third level nobody can read.
 */
function CommentBlock({
  comment,
  postSlug,
  isReply = false,
}: {
  comment: BoardComment;
  postSlug: string;
  isReply?: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const [state, formAction, pending] = useActionState(submitComment.bind(null, postSlug, comment.id), null);

  return (
    <div className={`rounded-xl border bg-white p-4 ${comment.fromBusiness ? "border-brand-blue/30" : "border-neutral-border"}`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-bold text-neutral-ink">
          {comment.authorName}
          {/* The owner answering carries weight an anonymous reply does not,
              so the page says which it is. */}
          {comment.fromBusiness && (
            <span className="ml-2 rounded-full bg-brand-blue-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-blue">
              Owner
            </span>
          )}
        </p>
        <span className="shrink-0 text-[11px] text-neutral-muted">
          {new Date(comment.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
        </span>
      </div>

      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-neutral-mid">{comment.body}</p>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        {!replying && !state?.success && (
          <button
            type="button"
            onClick={() => setReplying(true)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-muted transition-colors hover:text-brand-blue"
          >
            <CornerDownRight size={11} /> Reply
          </button>
        )}
        <ReportLink targetType="comment" targetId={comment.id} postSlug={postSlug} />
      </div>

      {state?.success && (
        <p className="mt-2 text-xs text-emerald-700">
          {state.held ? "Your reply is with us to check, because it contains a link." : "Reply posted."}
        </p>
      )}

      {replying && !state?.success && (
        <form action={formAction} className="mt-3 flex flex-col gap-2">
          <textarea
            name="body"
            rows={2}
            required
            maxLength={1000}
            placeholder={isReply ? "Add to this" : `Reply to ${comment.authorName}`}
            className={inputClass}
          />
          <input type="text" name="displayName" required placeholder="Your name" className={inputClass} />
          <TurnstileWidget />
          {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-brand-blue px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
            >
              {pending ? "Posting..." : "Reply"}
            </button>
            <button
              type="button"
              onClick={() => setReplying(false)}
              className="rounded-full border border-neutral-border px-4 py-2 text-xs font-semibold text-neutral-mid"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function BoardComments({
  postSlug,
  comments,
  likeCount,
  businessSlug,
  businessName,
}: {
  postSlug: string;
  comments: BoardComment[];
  likeCount: number;
  businessSlug: string | null;
  businessName: string | null;
}) {
  const [commentState, commentAction, commentPending] = useActionState(submitComment.bind(null, postSlug, null), null);

  const [likes, setLikes] = useState(likeCount);
  const [liked, setLiked] = useState(false);

  async function onLike() {
    // Optimistic, because a heart that waits for a server is a heart nobody
    // taps twice.
    const next = !liked;
    setLiked(next);
    setLikes((count) => count + (next ? 1 : -1));

    const result = await toggleLike(postSlug);
    if (result?.error) {
      setLiked(!next);
      setLikes((count) => count + (next ? -1 : 1));
    }
  }

  return (
    <div className="flex flex-col gap-5 border-t border-neutral-border pt-5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onLike}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
            liked
              ? "border-red-200 bg-red-50 text-red-600"
              : "border-neutral-border bg-white text-neutral-mid hover:border-red-200 hover:text-red-600"
          }`}
        >
          <Heart size={15} className={liked ? "fill-red-500 text-red-500" : ""} />
          {likes > 0 ? likes : "Like"}
        </button>

        {/* Dewald's ask: a star next to the heart. It opens the review flow
            that already exists on the business page, so a rating lives in
            one place instead of two systems disagreeing about the same
            business. */}
        {businessSlug && (
          <Link
            href={`/${businessSlug}#reviews`}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-border bg-white px-4 py-2 text-sm font-semibold text-neutral-mid transition-colors hover:border-amber-300 hover:text-amber-600"
          >
            <Star size={15} />
            Review {businessName ?? "this business"}
          </Link>
        )}

        <span className="inline-flex items-center gap-1.5 text-sm text-neutral-muted">
          <MessageSquare size={15} />
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </span>
      </div>

      {commentState?.success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {commentState.held
            ? "Thanks. Your comment is with us to check before it appears, because it contains a link."
            : "Thanks, your comment is up."}
        </p>
      ) : (
        <form action={commentAction} className="flex flex-col gap-3 rounded-xl border border-neutral-border bg-white p-4">
          <p className="text-sm font-semibold text-neutral-ink">Ask a question or leave a comment</p>
          <textarea
            name="body"
            rows={3}
            required
            maxLength={1000}
            placeholder="What would this cost for a double garage?"
            className={inputClass}
          />

          <input type="text" name="displayName" required placeholder="Your name" className={inputClass} />

          {/* Optional, and it says why. Nobody is stopped for want of it. */}
          <details className="text-sm">
            <summary className="cursor-pointer text-xs font-semibold text-neutral-muted hover:text-brand-blue">
              Want to know when they reply? Add your email
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              <input type="email" name="email" placeholder="Your email, optional" className={inputClass} />
              <label className="flex items-start gap-2 text-xs text-neutral-mid">
                <input type="checkbox" name="quoteConsent" className="mt-0.5" />
                <span>This business may email me a quote at this address.</span>
              </label>
              <p className="text-xs text-neutral-muted">
                Never shown on the page, and never given to the business unless you tick the box.
              </p>
            </div>
          </details>

          <TurnstileWidget />

          {commentState?.error && <p className="text-xs text-red-600">{commentState.error}</p>}

          <button
            type="submit"
            disabled={commentPending}
            className="self-start rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
          >
            {commentPending ? "Posting..." : "Post comment"}
          </button>
        </form>
      )}

      {comments.length > 0 && (
        <ul className="flex flex-col gap-3">
          {comments.map((comment) => (
            <li key={comment.id}>
              <CommentBlock comment={comment} postSlug={postSlug} />
              {comment.replies.length > 0 && (
                <ul className="mt-2 flex flex-col gap-2 border-l-2 border-neutral-border pl-3 sm:ml-6">
                  {comment.replies.map((reply) => (
                    <li key={reply.id}>
                      <CommentBlock comment={reply} postSlug={postSlug} isReply />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { ReportLink };
