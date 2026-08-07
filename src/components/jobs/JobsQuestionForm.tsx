"use client";

import { useActionState } from "react";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";
import { submitJobsQuestion, type JobsQuestionState } from "@/app/jobs/faq/actions";

// Ask us anything, or tell us what is missing. Deliberately three fields:
// every extra one costs an answer, and we can ask the rest in the reply.
export function JobsQuestionForm() {
  const [state, formAction, pending] = useActionState<JobsQuestionState, FormData>(
    submitJobsQuestion,
    null,
  );

  if (state?.success) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
        <p className="text-sm font-bold text-green-900">Thank you, we have it.</p>
        <p className="mt-1 text-sm text-green-800">
          A real person reads every one of these and will reply to the email address you gave us. We are
          a small team, so give us a day or two.
        </p>
      </div>
    );
  }

  const field =
    "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 outline-none focus:border-neutral-900";
  const label = "flex flex-col gap-1.5 text-sm font-semibold text-neutral-700";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className={label}>
        Your name
        <input name="name" required autoComplete="name" className={field} />
      </label>
      <label className={label}>
        Your email
        <input
          name="email"
          type="email"
          inputMode="email"
          required
          autoComplete="email"
          className={field}
        />
        <span className="text-xs font-normal text-neutral-500">This is where we reply. Nothing else.</span>
      </label>
      <label className={label}>
        Your question or suggestion
        <textarea
          name="message"
          rows={5}
          required
          maxLength={2000}
          placeholder="Ask us anything, or tell us what would make this more useful for you."
          className={field}
        />
      </label>

      <TurnstileWidget siteKey={process.env.NEXT_PUBLIC_JOBS_TURNSTILE_SITE_KEY} />

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-full bg-neutral-900 px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Sending..." : "Send it"}
      </button>
      <p className="text-center text-xs text-neutral-500">
        We never ask for your ID number or bank details, here or anywhere else on KatisoBiz Jobs.
      </p>
    </form>
  );
}
