"use client";

import { useActionState } from "react";
import { resetPassword } from "@/app/reset-password/actions";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { SiteFooter } from "@/components/SiteFooter";

// Public Beta Polish Sprint Sec 1: landed on via auth/callback's own
// type=recovery branch, which already established the session from the
// emailed reset link — this page just collects the new password.
export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(resetPassword, null);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
      <BrandHeader />
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-ink">Reset your password</h1>
        <p className="text-sm text-gray-500">Choose a new password for your account.</p>
        <form action={formAction} className="flex w-full flex-col gap-3 text-left">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            New password
            <input
              type="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          {state?.error?.password && <p className="text-xs text-red-600">{state.error.password[0]}</p>}

          <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            Confirm new password
            <input
              type="password"
              name="confirmPassword"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Type it again"
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          {state?.error?.confirmPassword && <p className="text-xs text-red-600">{state.error.confirmPassword[0]}</p>}
          {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {pending ? "Saving..." : "Reset password"}
          </button>
        </form>
      </div>
      <SiteFooter />
    </main>
  );
}
