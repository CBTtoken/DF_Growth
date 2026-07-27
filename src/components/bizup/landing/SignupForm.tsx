"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpForBizUp } from "@/app/bizup/signup/actions";

// Four fields, deliberately. Landing copy, conversion note 2: "Every field
// on a signup form costs conversions, and this audience abandons fast."
// Everything else is collected inside setup, once they are committed.

const input =
  "w-full rounded-xl border border-neutral-border bg-white px-4 py-3 text-base text-neutral-ink outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";
const label = "flex flex-col gap-1.5 text-sm font-semibold text-neutral-mid";

export function SignupForm() {
  const [state, action, pending] = useActionState(signUpForBizUp, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className={label}>
        Your business name
        <input name="businessName" autoComplete="organization" placeholder="Sipho's Plumbing" className={input} />
        {state?.error?.businessName?.[0] && (
          <span className="text-xs font-normal text-red-600">{state.error.businessName[0]}</span>
        )}
      </label>

      <label className={label}>
        Your mobile number
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="082 555 0134"
          className={input}
        />
        {state?.error?.phone?.[0] && (
          <span className="text-xs font-normal text-red-600">{state.error.phone[0]}</span>
        )}
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
          This is how you log in, and where your own copies go.
        </span>
        {state?.error?.email?.[0] && (
          <span className="text-xs font-normal text-red-600">{state.error.email[0]}</span>
        )}
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
        {state?.error?.password?.[0] && (
          <span className="text-xs font-normal text-red-600">{state.error.password[0]}</span>
        )}
      </label>

      {state?.error?._form?.[0] && <p className="text-sm text-red-600">{state.error._form[0]}</p>}

      <button type="submit" disabled={pending} className="btn-accent-lg mt-1 w-full">
        {pending ? "Setting up..." : "Start free, no card needed"}
      </button>

      <p className="text-center text-xs leading-relaxed text-neutral-muted">
        By starting, you agree to our{" "}
        <Link href="/terms" className="font-semibold text-brand-blue hover:underline">Terms</Link> and{" "}
        <Link href="/privacy" className="font-semibold text-brand-blue hover:underline">Privacy Policy</Link>.
      </p>
    </form>
  );
}
