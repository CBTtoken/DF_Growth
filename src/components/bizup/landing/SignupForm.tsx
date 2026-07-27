"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signUpForBizUp, confirmBizUpSignup, resendBizUpCode } from "@/app/bizup/signup/actions";
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
  const [resendState, resendAction, resending] = useActionState(resendBizUpCode, null);

  // Lets "use a different email" actually work. The previous version was a
  // link to this same page, so React kept the component mounted, the state
  // survived, and clicking it did nothing at all. Found by Dewald when a
  // code expired and there was no way out of the code screen.
  const [restarted, setRestarted] = useState(false);

  const awaiting = restarted
    ? null
    : (resendState?.awaitingCode ?? confirmState?.awaitingCode ?? state?.awaitingCode);

  if (awaiting) {
    return (
      <form action={confirmAction} className="flex flex-col gap-4">
        <input type="hidden" name="email" value={awaiting} />

        <div className="rounded-xl border border-brand-blue/20 bg-brand-blue-light p-4">
          <p className="text-sm font-bold text-neutral-ink">Check your email</p>
          <p className="mt-1 text-sm text-neutral-mid">
            We sent a code to <strong>{awaiting}</strong>. Enter it below and you are in.
          </p>
        </div>

        <label className={label}>
          Your code
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            // Deliberately generous and deliberately not a fixed length.
            // Supabase decides how long this code is (mailer_otp_length,
            // currently 8), and hardcoding 6 here silently truncated it so
            // the code could never be entered in full. Found by Dewald when
            // a perfectly good code would not verify.
            maxLength={12}
            placeholder="12345678"
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

        {resendState?.resent && (
          <p className="text-center text-sm font-medium text-green-700">
            A new code is on its way. The old one no longer works.
          </p>
        )}
        {resendState?.error?._form?.[0] && (
          <p className="text-center text-sm text-red-600">{resendState.error._form[0]}</p>
        )}

        {/* The way out, and both halves of it were missing. There was no way
            to get a fresh code at all, and the only escape was a link to
            this same page, which changed nothing. */}
        <div className="flex flex-col gap-2 border-t border-neutral-border pt-4">
          <p className="text-center text-xs text-neutral-muted">
            No code, or has it been sitting a while? Check your spam folder. Codes stop working
            after an hour.
          </p>
          <button
            type="submit"
            formAction={resendAction}
            disabled={resending}
            className="w-full rounded-full border border-neutral-border bg-white px-5 py-3 text-sm font-bold text-neutral-mid transition hover:border-brand-blue hover:text-brand-blue disabled:opacity-50"
          >
            {resending ? "Sending..." : "Send me a new code"}
          </button>
          <button
            type="button"
            onClick={() => setRestarted(true)}
            className="text-center text-xs font-semibold text-neutral-muted underline-offset-2 hover:text-brand-blue hover:underline"
          >
            Use a different email address
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      // Clears the restart flag, so submitting again brings the code screen
      // back for the new address instead of appearing to do nothing.
      action={(fd) => {
        setRestarted(false);
        action(fd);
      }}
      className="flex flex-col gap-4"
    >
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
      <TurnstileWidget siteKey={process.env.NEXT_PUBLIC_BIZUP_TURNSTILE_SITE_KEY} />

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
