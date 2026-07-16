"use client";

import { useActionState, useState } from "react";
import { signUpReviewer, verifyReviewerSignupOtp } from "@/lib/reviews/actions";
import { BrandHeader } from "@/components/brand/BrandHeader";

// Rate & Review Sprint 1. Two-step flow (create account, then enter the
// emailed code) rather than the original single clickable-link design —
// see actions.ts's comment on signUpReviewer for why the link approach
// was abandoned. Email is tracked in local state between steps since the
// OTP step's Server Action needs it and there's no session yet to read it
// from server-side.
export default function ReviewerSignupPage() {
  const [step, setStep] = useState<"signup" | "otp" | "done">("signup");
  const [email, setEmail] = useState("");

  const [signupState, signupAction, signupPending] = useActionState(
    async (_prevState: Awaited<ReturnType<typeof signUpReviewer>>, formData: FormData) => {
      const result = await signUpReviewer(_prevState, formData);
      if (result?.success) {
        setEmail(String(formData.get("email")));
        setStep("otp");
      }
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

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8">
      <BrandHeader />
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        {step === "signup" && (
          <>
            <div className="text-center">
              <h1 className="text-xl font-bold tracking-tight text-ink">Create your reviewer account</h1>
              <p className="mt-1 text-sm text-gray-500">Just enough to leave a real, verified review.</p>
            </div>
            <form action={signupAction} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                First name
                <input
                  type="text"
                  name="displayName"
                  required
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </label>
              {signupState?.error?.displayName && <p className="text-xs text-red-600">{signupState.error.displayName[0]}</p>}

              <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                Email
                <input
                  type="email"
                  name="email"
                  required
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </label>
              {signupState?.error?.email && <p className="text-xs text-red-600">{signupState.error.email[0]}</p>}

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
              {signupState?.error?.password && <p className="text-xs text-red-600">{signupState.error.password[0]}</p>}
              {signupState?.error?._form && <p className="text-xs text-red-600">{signupState.error._form[0]}</p>}

              <button
                type="submit"
                disabled={signupPending}
                className="mt-2 inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50"
              >
                {signupPending ? "Creating…" : "Create account"}
              </button>
            </form>
          </>
        )}

        {step === "otp" && (
          <>
            <div className="text-center">
              <h1 className="text-xl font-bold tracking-tight text-ink">Check your email</h1>
              <p className="mt-1 text-sm text-gray-500">
                We sent a 6-digit code to <span className="font-medium text-ink">{email}</span>.
              </p>
            </div>
            <form action={otpAction} className="flex flex-col gap-3">
              <input type="hidden" name="email" value={email} />
              <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                Code
                <input
                  type="text"
                  name="token"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-center text-lg tracking-[0.3em] text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </label>
              {otpState?.error && <p className="text-xs text-red-600">{otpState.error}</p>}

              <button
                type="submit"
                disabled={otpPending}
                className="mt-2 inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50"
              >
                {otpPending ? "Confirming…" : "Confirm"}
              </button>
            </form>
          </>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-brand/10 text-2xl text-brand">✓</span>
            <h1 className="text-xl font-bold tracking-tight text-ink">You&apos;re verified</h1>
            <p className="text-sm text-gray-500">Your account is confirmed and ready.</p>
          </div>
        )}
      </div>
    </main>
  );
}
