"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signUpEmployer, confirmEmployerSignup, resendEmployerCode } from "@/app/jobs/employers/signup/actions";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";

// Same two-step shape as the candidate SignupForm, different fields:
// business name and cell lead (the spec's one-step registration), email
// and password because that is how they log back in.

const input =
  "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 outline-none transition-colors focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10";
const label = "flex flex-col gap-1.5 text-sm font-semibold text-neutral-700";
const err = "text-xs font-normal text-red-600";

export function EmployerSignupForm() {
  const [state, action, pending] = useActionState(signUpEmployer, null);
  const [confirmState, confirmAction, confirming] = useActionState(confirmEmployerSignup, null);
  const [resendState, resendAction, resending] = useActionState(resendEmployerCode, null);
  const [restarted, setRestarted] = useState(false);

  const awaiting = restarted
    ? null
    : (resendState?.awaitingCode ?? confirmState?.awaitingCode ?? state?.awaitingCode);

  if (awaiting) {
    return (
      <form action={confirmAction} className="flex flex-col gap-4">
        <input type="hidden" name="email" value={awaiting} />

        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm font-bold text-neutral-900">Check your email</p>
          <p className="mt-1 text-sm text-neutral-600">
            We sent a code to <strong>{awaiting}</strong>. Enter it below and you are in.
          </p>
        </div>

        <label className={label}>
          Your code
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={12}
            placeholder="12345678"
            className={`${input} text-center tracking-[0.4em]`}
          />
          {confirmState?.error?.code?.[0] && <span className={err}>{confirmState.error.code[0]}</span>}
        </label>

        {confirmState?.error?._form?.[0] && <p className="text-sm text-red-600">{confirmState.error._form[0]}</p>}

        <button
          type="submit"
          disabled={confirming}
          className="mt-1 inline-flex w-full items-center justify-center rounded-full bg-neutral-900 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800 disabled:opacity-50"
        >
          {confirming ? "Checking..." : "Confirm and continue"}
        </button>

        {resendState?.resent && (
          <p className="text-center text-sm font-medium text-green-700">
            A new code is on its way. The old one no longer works.
          </p>
        )}
        {resendState?.error?._form?.[0] && <p className="text-center text-sm text-red-600">{resendState.error._form[0]}</p>}

        <div className="flex flex-col gap-2 border-t border-neutral-200 pt-4">
          <p className="text-center text-xs text-neutral-500">
            No code, or has it been sitting a while? Check your spam folder. Codes stop working after an hour.
          </p>
          <button
            type="submit"
            formAction={resendAction}
            disabled={resending}
            className="w-full rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-bold text-neutral-600 transition hover:border-neutral-900 hover:text-neutral-900 disabled:opacity-50"
          >
            {resending ? "Sending..." : "Send me a new code"}
          </button>
          <button
            type="button"
            onClick={() => setRestarted(true)}
            className="text-center text-xs font-semibold text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
          >
            Use a different email address
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      action={(fd) => {
        setRestarted(false);
        action(fd);
      }}
      className="flex flex-col gap-4"
    >
      <label className={label}>
        Your business name
        <input name="businessName" autoComplete="organization" placeholder="Jetting Worx" className={input} />
        {state?.error?.businessName?.[0] && <span className={err}>{state.error.businessName[0]}</span>}
      </label>

      <label className={label}>
        Your cell number
        <input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="082 555 0134" className={input} />
        {state?.error?.phone?.[0] && <span className={err}>{state.error.phone[0]}</span>}
      </label>

      <label className={label}>
        Your email
        <input name="email" type="email" inputMode="email" autoComplete="email" placeholder="you@business.co.za" className={input} />
        <span className="text-xs font-normal text-neutral-500">
          We send a code here to check it works. It is how you log in.
        </span>
        {state?.error?.email?.[0] && <span className={err}>{state.error.email[0]}</span>}
      </label>

      <label className={label}>
        Choose a password
        <input name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" className={input} />
        {state?.error?.password?.[0] && <span className={err}>{state.error.password[0]}</span>}
      </label>

      <TurnstileWidget siteKey={process.env.NEXT_PUBLIC_JOBS_TURNSTILE_SITE_KEY} />

      {state?.error?._form?.[0] && <p className="text-sm text-red-600">{state.error._form[0]}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 inline-flex w-full items-center justify-center rounded-full bg-neutral-900 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Sending your code..." : "Create my employer account"}
      </button>

      <p className="text-center text-xs leading-relaxed text-neutral-500">
        By continuing, you agree to our{" "}
        <Link href="/terms" className="font-semibold text-neutral-900 hover:underline">Terms</Link> and{" "}
        <Link href="/privacy" className="font-semibold text-neutral-900 hover:underline">Privacy Policy</Link>.
      </p>
    </form>
  );
}
