"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpForBizUp, confirmBizUpSignup } from "@/app/bizup/signup/actions";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";

// Four fields, deliberately. Landing copy, conversion note 2: "Every field
// on a signup form costs conversions, and this audience abandons fast."
// Everything else is collected inside setup, once they are committed.
//
// The code step was added after Dewald found that signup let you straight
// in with no verification at all. It costs one screen and buys a working
// email address, which the whole product depends on: a member whose email
// is wrong cannot receive their own copies and cannot recover the account.

const input =
  "w-full rounded-xl border border-neutral-border bg-white px-4 py-3 text-base text-neutral-ink outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";
const label = "flex flex-col gap-1.5 text-sm font-semibold text-neutral-mid";
const err = "text-xs font-normal text-red-600";

export function SignupForm() {
  const [state, action, pending] = useActionState(signUpForBizUp, null);
  const [confirmState, confirmAction, confirming] = useActionState(confirmBizUpSignup, null);

  const awaiting = confirmState?.awaitingCode ?? state?.awaitingCode;

  if (awaiting) {
    return (
      <form action={confirmAction} className="flex flex-col gap-4">
        <input type="hidden" name="email" value={awaiting} />

        <div className="rounded-xl border border-brand-blue/20 bg-brand-blue-light p-4">
          <p className="text-sm font-bold text-neutral-ink">Check your email</p>
          <p className="mt-1 text-sm text-neutral-mid">
            We sent a 6-digit code to <strong>{awaiting}</strong>. Enter it below and you are in.
          </p>
        </div>

        <label className={label}>
          Your code
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            placeholder="123456"
            className={`${input} text-center tracking-[0.4em]`}
          />
          {confirmState?.error?.code?.[0] && <span className={err}>{confirmState.error.code[0]}</span>}
        </label>

        {confirmState?.error?._form?.[0] && (
          <p className="text-sm text-red-600">{confirmState.error._form[0]}</p>
        )}

        <button type="submit" disabled={confirming} className="btn-accent-lg w-full">
          {confirming ? "Checking..." : "Confirm and start"}
        </button>

        <p className="text-center text-xs text-neutral-muted">
          No code? Check your spam folder, or{" "}
          <Link href="/bizup/signup" className="font-semibold text-brand-blue hover:underline">
            start again
          </Link>
          .
        </p>
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className={label}>
        Your business name
        <input name="businessName" autoComplete="organization" placeholder="Sipho's Plumbing" className={input} />
        {state?.error?.businessName?.[0] && <span className={err}>{state.error.businessName[0]}</span>}
      </label>

      <label className={label}>
        Your mobile number
        <input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="082 555 0134" className={input} />
        {state?.error?.phone?.[0] && <span className={err}>{state.error.phone[0]}</span>}
      </label>

      <label className={label}>
        Your email
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@business.co.za"
          className={input}
        />
        <span className="text-xs font-normal text-neutral-muted">
          We send a code here to check it works. It is how you log in and where your own copies go.
        </span>
        {state?.error?.email?.[0] && <span className={err}>{state.error.email[0]}</span>}
      </label>

      <label className={label}>
        Choose a password
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          className={input}
        />
        {state?.error?.password?.[0] && <span className={err}>{state.error.password[0]}</span>}
      </label>

      {/* Bot protection, same widget the reviews and events forms use. */}
      <TurnstileWidget />

      {state?.error?._form?.[0] && <p className="text-sm text-red-600">{state.error._form[0]}</p>}

      <button type="submit" disabled={pending} className="btn-accent-lg mt-1 w-full">
        {pending ? "Sending your code..." : "Start free, no card needed"}
      </button>

      <p className="text-center text-xs leading-relaxed text-neutral-muted">
        By starting, you agree to our{" "}
        <Link href="/terms" className="font-semibold text-brand-blue hover:underline">Terms</Link> and{" "}
        <Link href="/privacy" className="font-semibold text-brand-blue hover:underline">Privacy Policy</Link>.
      </p>
    </form>
  );
}
