"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { submitReviewSimple } from "@/lib/reviews/actions";
import type { ReviewTarget } from "@/lib/reviews/fraud-signals";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";

// Leaving a review, in one screen.
//
// What this replaces: pick new or returning, create a password, submit, go
// to your inbox, find a code, come back, type it in. Six weeks live, zero
// reviews. Not few. Zero.
//
// The board proved the fix the night before: a name, the invisible
// Cloudflare check, and an optional email for somebody who wants to know
// when the business replies. It uses the same identity as the board, so
// somebody who commented on a post yesterday is already known here.
//
// The fraud checks did not change. A review from the business's own address,
// or a burst from one network, is still flagged and still waits for a human.
// The door changed, not the guard.
export function ReviewSubmissionForm({
  target,
  accentColor,
  defaultOpen = false,
}: {
  target: ReviewTarget;
  accentColor: string;
  /** The dedicated /bizup/review/[accountId] capture page has no other
   *  content to click through first, so it skips the "Leave a review"
   *  teaser button and opens straight into the form. */
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [rating, setRating] = useState(0);
  const [state, formAction, pending] = useActionState(submitReviewSimple.bind(null, target), null);

  if (state?.success) {
    return (
      <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        {state.held
          ? "Thank you. Your review is with us to check before it appears."
          : "Thank you, your review is up."}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5"
        style={{ backgroundColor: accentColor }}
      >
        <Star size={16} />
        Leave a review
      </button>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-gray-700">How was it?</span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              aria-label={`${value} out of 5`}
              className="p-0.5"
            >
              <Star
                size={26}
                className={value <= rating ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}
              />
            </button>
          ))}
        </div>
        <input type="hidden" name="rating" value={rating} />
      </div>

      <textarea
        name="reviewText"
        rows={3}
        required
        maxLength={2000}
        placeholder="What did they do, and how did it go?"
        className={inputClass}
      />

      <input type="text" name="displayName" required placeholder="Your name" className={inputClass} />

      <details className="text-sm">
        <summary className="cursor-pointer text-xs font-semibold text-gray-500 hover:text-brand">
          Want to know when they reply? Add your email
        </summary>
        <div className="mt-2">
          <input type="email" name="email" placeholder="Your email, optional" className={inputClass} />
          <p className="mt-1 text-xs text-gray-500">Never shown on the page.</p>
        </div>
      </details>

      <TurnstileWidget />

      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || rating === 0}
          className="rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50"
          style={{ backgroundColor: accentColor }}
        >
          {pending ? "Posting..." : "Post review"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
