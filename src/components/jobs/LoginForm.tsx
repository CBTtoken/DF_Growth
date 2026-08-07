"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginToJobs } from "@/app/jobs/login/actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginToJobs, null);

  return (
    <form action={formAction} className="flex w-full flex-col gap-3 text-left">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Email
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
        />
      </label>
      {state?.error?.email?.[0] && <p className="text-xs text-red-600">{state.error.email[0]}</p>}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Password
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="Your password"
          className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
        />
      </label>
      {state?.error?.password?.[0] && <p className="text-xs text-red-600">{state.error.password[0]}</p>}
      {state?.error?._form?.[0] && <p className="text-xs text-red-600">{state.error._form[0]}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 inline-flex items-center justify-center rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800 disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {pending ? "Logging in..." : "Log in"}
      </button>
      <Link
        href="/forgot-password"
        className="text-center text-xs font-medium text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
      >
        Forgot your password?
      </Link>
    </form>
  );
}
