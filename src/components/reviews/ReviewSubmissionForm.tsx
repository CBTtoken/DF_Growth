"use client";

import { useActionState, useState } from "react";
import {
  submitReviewNewReviewer,
  submitReviewExistingReviewer,
  verifyReviewerSignupOtp,
} from "@/lib/reviews/actions";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";

// Rate & Review Sprint 1. Two account paths share the same rating/review
// fields — "I want to leave a review" is the actual user journey, account
// creation (or login) is incidental to that, not a separate destination.
export function ReviewSubmissionForm({ businessId, accentColor }: { businessId: string; accentColor: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [step, setStep] = useState<"form" | "otp" | "done">("form");
  const [rating, setRating] = useState(0);
  const [pendingEmail, setPendingEmail] = useState("");

  const [newState, newAction, newPending] = useActionState(
    async (_prevState: Awaited<ReturnType<typeof submitReviewNewReviewer>>, formData: FormData) => {
      const result = await submitReviewNewReviewer(_prevState, formData);
      if (result?.success) {
        setPendingEmail(String(formData.get("email")));
        setStep("otp");
      }
      return result;
    },
    null
  );

  const [existingState, existingAction, existingPending] = useActionState(
    async (_prevState: Awaited<ReturnType<typeof submitReviewExistingReviewer>>, formData: FormData) => {
      const result = await submitReviewExistingReviewer(_prevState, formData);
      if (result?.success) setStep("done");
      return result;
    },
    null
  );

  const [otpState, otpAction, otpPending] = useActionState(
    async (_prevState: Awaited<ReturnType<typeof verifyReviewerSignupOtp>>, formData: FormData) => {
      const result = await verifyReviewerSignupOtp(_prevState, formData);
      if (result?.success) setStep("done");
      return result;
    },
    null
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5"
        style={{ backgroundColor: accentColor }}
      >
        Leave a review
      </button>
    );
  }

  if (step === "done") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-6 text-center">
        <span
          className="grid size-12 place-items-center rounded-full text-xl text-white"
          style={{ backgroundColor: accentColor }}
        >
          ✓
        </span>
        <p className="font-semibold text-ink">
          {mode === "new" ? "Thanks — your review is live." : "Thanks for your review."}
        </p>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-6">
        <p className="text-sm text-gray-500">
          We sent a 6-digit code to <span className="font-medium text-ink">{pendingEmail}</span>. Enter it to
          publish your review.
        </p>
        <form action={otpAction} className="flex flex-col gap-3">
          <input type="hidden" name="email" value={pendingEmail} />
          <input
            type="text"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-center text-lg tracking-[0.3em] text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          {otpState?.error && <p className="text-xs text-red-600">{otpState.error}</p>}
          <button
            type="submit"
            disabled={otpPending}
            className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
            style={{ backgroundColor: accentColor }}
          >
            {otpPending ? "Confirming…" : "Confirm"}
          </button>
        </form>
      </div>
    );
  }

  const ratingAndText = (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-gray-700">Rating</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              className="text-2xl leading-none"
              style={{ color: n <= rating ? accentColor : "#d1d5db" }}
            >
              ★
            </button>
          ))}
        </div>
        <input type="hidden" name="rating" value={rating} />
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
        Your review
        <textarea
          name="reviewText"
          required
          minLength={10}
          rows={4}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </label>
    </>
  );

  return (
    <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-ink">Leave a review</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">
          Cancel
        </button>
      </div>

      {mode === "new" ? (
        <form action={newAction} className="flex flex-col gap-3">
          <input type="hidden" name="businessId" value={businessId} />
          {ratingAndText}
          <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            First name
            <input
              type="text"
              name="displayName"
              required
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          {newState?.error?.displayName && <p className="text-xs text-red-600">{newState.error.displayName[0]}</p>}
          <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            Email
            <input
              type="email"
              name="email"
              required
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          {newState?.error?.email && <p className="text-xs text-red-600">{newState.error.email[0]}</p>}
          <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            Password
            <input
              type="password"
              name="password"
              required
              minLength={8}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          {newState?.error?.password && <p className="text-xs text-red-600">{newState.error.password[0]}</p>}
          {newState?.error?.rating && <p className="text-xs text-red-600">{newState.error.rating[0]}</p>}
          {newState?.error?.reviewText && <p className="text-xs text-red-600">{newState.error.reviewText[0]}</p>}
          {newState?.error?._form && <p className="text-xs text-red-600">{newState.error._form[0]}</p>}

          <TurnstileWidget />

          <button
            type="submit"
            disabled={newPending || rating === 0}
            className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
            style={{ backgroundColor: accentColor }}
          >
            {newPending ? "Submitting…" : "Submit review"}
          </button>
          <button type="button" onClick={() => setMode("existing")} className="text-xs text-gray-400 hover:text-gray-600">
            Already have an account? Log in
          </button>
        </form>
      ) : (
        <form action={existingAction} className="flex flex-col gap-3">
          <input type="hidden" name="businessId" value={businessId} />
          {ratingAndText}
          <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            Email
            <input
              type="email"
              name="email"
              required
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            Password
            <input
              type="password"
              name="password"
              required
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          {existingState?.error?.rating && <p className="text-xs text-red-600">{existingState.error.rating[0]}</p>}
          {existingState?.error?.reviewText && <p className="text-xs text-red-600">{existingState.error.reviewText[0]}</p>}
          {existingState?.error?._form && <p className="text-xs text-red-600">{existingState.error._form[0]}</p>}

          <TurnstileWidget />

          <button
            type="submit"
            disabled={existingPending || rating === 0}
            className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
            style={{ backgroundColor: accentColor }}
          >
            {existingPending ? "Submitting…" : "Submit review"}
          </button>
          <button type="button" onClick={() => setMode("new")} className="text-xs text-gray-400 hover:text-gray-600">
            New here? Create an account
          </button>
        </form>
      )}
    </div>
  );
}
