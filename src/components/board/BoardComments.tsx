"use client";

import { useActionState, useState } from "react";
import { Flag, Heart, MessageSquare } from "lucide-react";
import { submitComment, verifyBoardOtp, toggleLike, reportContent } from "@/app/board/actions";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";
import type { BoardComment } from "@/lib/board/engagement";

// The Board, Phase 2, everything the public can do on a post page.
//
// The order of the flow is the design. A person writes the comment first and
// verifies second, because asking someone to prove an email before they have
// said anything is how you get no comments. The comment is stored out of
// sight the moment they submit, and appears when the code is entered.
//
// The comments arrive as a prop from the server component and are rendered
// straight into the HTML, never fetched from the browser. So they are real
// page content for a crawler and for anyone with JavaScript switched off,
// and they count as content on the page rather than as something that
// appears later.

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

export function BoardComments({
  postSlug,
  comments,
  likeCount,
}: {
  postSlug: string;
  comments: BoardComment[];
  likeCount: number;
}) {
  const [commentState, commentAction, commentPending] = useActionState(submitComment.bind(null, postSlug), null);
  const [otpState, otpAction, otpPending] = useActionState(verifyBoardOtp.bind(null, postSlug), null);

  const [likes, setLikes] = useState(likeCount);
  const [liked, setLiked] = useState(false);
  const [likeNeedsIdentity, setLikeNeedsIdentity] = useState(false);

  const pendingEmail = commentState && "needsCode" in commentState ? commentState.email : "";
  const needsCode = Boolean(pendingEmail) && !otpState?.success;
  const posted = (commentState && "success" in commentState) || otpState?.success;
  const held =
    (commentState && "success" in commentState && commentState.held) || Boolean(otpState?.success && otpState.held);

  async function onLike() {
    const result = await toggleLike(postSlug);
    if (result?.needsIdentity) {
      setLikeNeedsIdentity(true);
      return;
    }
    if (result?.liked !== undefined) {
      setLiked(result.liked);
      setLikes((count) => count + (result.liked ? 1 : -1));
      setLikeNeedsIdentity(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 border-t border-neutral-border pt-5">
      <div className="flex flex-wrap items-center gap-3">
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
        <span className="inline-flex items-center gap-1.5 text-sm text-neutral-muted">
          <MessageSquare size={15} />
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </span>
      </div>

      {likeNeedsIdentity && (
        <p className="rounded-xl border border-brand-blue/20 bg-brand-blue-light px-4 py-3 text-sm text-neutral-mid">
          Liking needs a verified email, the same as a comment. Leave a comment below once and you are verified for both.
        </p>
      )}

      {posted ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {held
            ? "Thanks. Your comment is with us to check before it appears, because it contains a link."
            : "Thanks, your comment is up."}
        </p>
      ) : needsCode ? (
        <form action={otpAction} className="flex flex-col gap-3 rounded-xl border border-neutral-border bg-white p-4">
          <div>
            <p className="text-sm font-semibold text-neutral-ink">Check your email</p>
            <p className="mt-1 text-sm text-neutral-mid">
              We sent a code to {pendingEmail}. Enter it and your comment goes up. No password, no account.
            </p>
          </div>
          <input type="hidden" name="email" value={pendingEmail} />
          <input
            type="text"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Code from your email"
            required
            className={inputClass}
          />
          {otpState?.error && <p className="text-xs text-red-600">{otpState.error}</p>}
          <button
            type="submit"
            disabled={otpPending}
            className="self-start rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
          >
            {otpPending ? "Checking..." : "Verify and post"}
          </button>
        </form>
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
          <div className="grid gap-3 sm:grid-cols-2">
            <input type="text" name="displayName" required placeholder="Your name" className={inputClass} />
            <input type="email" name="email" required placeholder="Your email" className={inputClass} />
          </div>

          {/* The only place an address changes hands, and it is a tick box
              rather than a footnote. Off unless the person turns it on. */}
          <label className="flex items-start gap-2 text-xs text-neutral-mid">
            <input type="checkbox" name="quoteConsent" className="mt-0.5" />
            <span>This business may email me a quote at this address.</span>
          </label>

          <p className="text-xs text-neutral-muted">
            Your email is only used to send you a one-time code, so we know you are a real person. It is never shown on
            the page.
          </p>

          <TurnstileWidget />

          {commentState && "error" in commentState && commentState.error?._form && (
            <p className="text-xs text-red-600">{commentState.error._form[0]}</p>
          )}
          {commentState && "error" in commentState && commentState.error?.body && (
            <p className="text-xs text-red-600">{commentState.error.body[0]}</p>
          )}
          {commentState && "error" in commentState && commentState.error?.email && (
            <p className="text-xs text-red-600">{commentState.error.email[0]}</p>
          )}
          {commentState && "error" in commentState && commentState.error?.displayName && (
            <p className="text-xs text-red-600">{commentState.error.displayName[0]}</p>
          )}

          <button
            type="submit"
            disabled={commentPending}
            className="self-start rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
          >
            {commentPending ? "Sending..." : "Post comment"}
          </button>
        </form>
      )}

      {comments.length > 0 && (
        <ul className="flex flex-col gap-3">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-xl border border-neutral-border bg-white p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-bold text-neutral-ink">{comment.authorName}</p>
                <span className="shrink-0 text-[11px] text-neutral-muted">
                  {new Date(comment.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-neutral-mid">{comment.body}</p>
              <div className="mt-2">
                <ReportLink targetType="comment" targetId={comment.id} postSlug={postSlug} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { ReportLink };
