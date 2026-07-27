"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/app/login/actions";
import { SiteFooter } from "@/components/SiteFooter";

// BizUp's own login page. Same Server Action, same credentials, same
// Supabase auth as Growth's /login — the only difference is the hidden
// `product` field, which tells resolveLandingPath that a member who holds
// both products meant BizUp this time. A member with only one product is
// routed by what they own and can log in from either page safely.
//
// Styling is deliberately plain for now: BizUp's brand content is still
// being written, and inventing a look here would only have to be undone.
export default function BizUpLoginPage() {
  const [state, formAction, pending] = useActionState(login, null);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
      <Link href="/bizup" className="text-2xl font-bold tracking-tight text-ink">
        BizUp
      </Link>
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-ink">Log in to BizUp</h1>
        <p className="text-sm text-gray-500">Enter the email and password you signed up with.</p>
        <form action={formAction} className="flex w-full flex-col gap-3 text-left">
          <input type="hidden" name="product" value="bizup" />

          <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            Email
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="you@business.co.za"
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          {state?.error?.email && <p className="text-xs text-red-600">{state.error.email[0]}</p>}

          <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            Password
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="Your password"
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          {state?.error?.password && <p className="text-xs text-red-600">{state.error.password[0]}</p>}
          {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {pending ? "Logging in..." : "Log in"}
          </button>
        </form>
        <Link href="/forgot-password" className="text-xs font-medium text-gray-500 underline-offset-2 hover:text-brand hover:underline">
          Forgot your password?
        </Link>
      </div>
      <SiteFooter />
    </main>
  );
}
