"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/forgot-password/actions";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, null);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
      <BrandHeader />
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        {state?.success ? (
          <>
            <span className="grid size-12 place-items-center rounded-full bg-brand/10 text-2xl text-brand">✓</span>
            <h1 className="text-xl font-bold tracking-tight text-ink">Check your email</h1>
            <p className="text-sm text-gray-500">
              If an account exists for that email, we&apos;ve sent a link to reset your password.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold tracking-tight text-ink">Forgot your password?</h1>
            <p className="text-sm text-gray-500">Enter your email and we&apos;ll send you a link to reset it.</p>
            <form action={formAction} className="flex w-full flex-col gap-3 text-left">
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
              {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}

              <button
                type="submit"
                disabled={pending}
                className="mt-2 inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {pending ? "Sending..." : "Send reset link"}
              </button>
            </form>
          </>
        )}
        <Link href="/login" className="text-xs font-medium text-gray-500 underline-offset-2 hover:text-brand hover:underline">
          Back to log in
        </Link>
      </div>
      <SiteFooter />
    </main>
  );
}
