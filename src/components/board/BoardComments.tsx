"use client";

import { useActionState, useState } from "react";
import { CornerDownRight, Flag, Heart, MessageSquare, Star } from "lucide-react";
import { submitComment, toggleLike, reportContent } from "@/app/board/actions";
import { ShareRow } from "@/components/board/ShareRow";
import { ReviewSubmissionForm } from "@/components/reviews/ReviewSubmissionForm";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";
import type { BoardComment } from "@/lib/board/engagement";

// Everything a reader does on a post, in the order Facebook taught everyone
// to expect it.
//
// Dewald's third round of feedback, and the sharpest: the heart, the review
// and the comment count were buried under the business block and the share
// block, so nobody could find them. They now sit in one bar directly under
// the post, the way they do on every social post anybody has ever used, and
// the comment box stays closed until somebody taps Comment.
//
// Comments arrive as a prop and render into the HTML, never fetched from the
// browser, so they are real page content for a crawler.

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

/** One comment, and the box to answer it. Replies are one level deep. */
function CommentBlock({ comment, postSlug }: { comment: BoardComment; postSlug: string }) {
  const [replying, setReplying] = useState(false);
  const [state, formAction, pending] = useActionState(submitComment.bind(null, postSlug, comment.id), null);

  return (
    <div className={`rounded-xl border bg-white p-3.5 ${comment.fromBusiness ? "border-brand-blue/30" : "border-neutral-border"}`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-bold text-neutral-ink">
          {comment.authorName}
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

      {state?.success ? (
        <p className="mt-2 text-xs text-emerald-700">
          {state.held ? "Your reply is with us to check, because it contains a link." : "Reply posted."}
        </p>
      ) : replying ? (
        <form action={formAction} className="mt-3 flex flex-col gap-2">
          <textarea name="body" rows={2} required maxLength={1000} placeholder="Your reply" className={inputClass} />
          <input type="text" name="displayName" required placeholder="Your name" className={inputClass} />
          <TurnstileWidget />
          {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-brand-blue px-4 py-2 text-xs font-semibold text-white hover:bg-brand-blue-dark disabled:opacity-50"
            >
              {pending ? "Posting..." : "Post reply"}
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
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setReplying(true)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-blue hover:underline"
          >
            <CornerDownRight size={11} /> Click here to reply
          </button>
          <ReportLink targetType="comment" targetId={comment.id} postSlug={postSlug} />
        </div>
      )}
    </div>
  );
}

export function BoardComments({
  postSlug,
  comments,
  likeCount,
  businessId,
  businessName,
  shareUrl,
  shareText,
}: {
  postSlug: string;
  comments: BoardComment[];
  likeCount: number;
  /** Null when a person posted this rather than a business. */
  businessId: string | null;
  businessName: string | null;
  shareUrl: string;
  shareText: string;
}) {
  const [commentState, commentAction, commentPending] = useActionState(submitComment.bind(null, postSlug, null), null);
  const [writing, setWriting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [likes, setLikes] = useState(likeCount);
  const [liked, setLiked] = useState(false);

  const totalComments = comments.reduce((sum, c) => sum + 1 + c.replies.length, 0);

  async function onLike() {
    // Optimistic. A heart that waits for a server is a heart nobody taps.
    const next = !liked;
    setLiked(next);
    setLikes((count) => count + (next ? 1 : -1));
    const result = await toggleLike(postSlug);
    if (result?.error) {
      setLiked(!next);
      setLikes((count) => count + (next ? -1 : 1));
    }
  }

  const barButton =
    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-sm font-semibold transition-colors";

  return (
    <div className="flex flex-col gap-4">
      {/* The bar, directly under the post. Like, review, comment, share, in
          the order everybody already knows. */}
      <div className="flex items-stretch gap-1 border-y border-neutral-border py-1">
        <button
          type="button"
          onClick={onLike}
          className={`${barButton} ${liked ? "text-red-600" : "text-neutral-mid hover:bg-neutral-light"}`}
        >
          <Heart size={17} className={liked ? "fill-red-500 text-red-500" : ""} />
          {likes > 0 ? likes : "Like"}
        </button>

        <button
          type="button"
          onClick={() => setWriting((open) => !open)}
          className={`${barButton} text-neutral-mid hover:bg-neutral-light`}
        >
          <MessageSquare size={17} />
          {totalComments > 0 ? totalComments : "Comment"}
        </button>

        {businessId && (
          <button
            type="button"
            onClick={() => setReviewing((open) => !open)}
            className={`${barButton} text-neutral-mid hover:bg-neutral-light`}
          >
            <Star size={17} />
            Review
          </button>
        )}
      </div>

      {reviewing && businessId && (
        <div className="rounded-xl border border-neutral-border bg-neutral-light p-4">
          <p className="mb-2 text-sm font-semibold text-neutral-ink">
            Review {businessName ?? "this business"}
          </p>
          <ReviewSubmissionForm target={{ businessId }} accentColor="#1081b8" />
        </div>
      )}

      <ShareRow url={shareUrl} text={shareText} />

      {commentState?.success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {commentState.held
            ? "Thanks. Your comment is with us to check before it appears, because it contains a link."
            : "Thanks, your comment is up."}
        </p>
      ) : writing ? (
        <form action={commentAction} className="flex flex-col gap-3 rounded-xl border border-neutral-border bg-white p-4">
          <textarea
            name="body"
            rows={3}
            required
            maxLength={1000}
            placeholder="What would this cost for a double garage?"
            className={inputClass}
          />
          <input type="text" name="displayName" required placeholder="Your name" className={inputClass} />

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

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={commentPending}
              className="rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
            >
              {commentPending ? "Posting..." : "Post comment"}
            </button>
            <button
              type="button"
              onClick={() => setWriting(false)}
              className="rounded-full border border-neutral-border px-5 py-2.5 text-sm font-semibold text-neutral-mid"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setWriting(true)}
          className="rounded-full border border-neutral-border bg-white px-4 py-2.5 text-left text-sm text-neutral-muted transition-colors hover:border-brand-blue/40 hover:text-brand-blue"
        >
          Click here to comment
        </button>
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
                      <CommentBlock comment={reply} postSlug={postSlug} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {businessName && (
        <p className="text-xs text-neutral-muted">
          Comments are public. {businessName} can answer here, and so can anyone else.
        </p>
      )}
    </div>
  );
}

export { ReportLink };
