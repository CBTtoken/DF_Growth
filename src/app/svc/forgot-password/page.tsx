import type { Metadata } from "next";
import { requestSvcPasswordReset } from "./actions";
import { svcBtnGreen, svcInput, svcLabel } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};

export default async function SvcForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="bg-svc-cream px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <h1 className="font-svc-heading text-3xl font-bold">Reset your password</h1>

        {params.sent ? (
          <div className="mt-6 border-2 border-svc-green bg-white/60 p-6">
            <p className="text-base leading-relaxed">
              If that email address has an account, a reset link is on its way.
              Open it on this device and choose a new password.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-2 text-base leading-relaxed text-svc-ink/75">
              Give us your email address and we will send you a link to choose
              a new password.
            </p>
            {params.error && (
              <p className="mt-6 border-2 border-svc-blue bg-white/60 p-4 text-sm leading-relaxed">
                {params.error === "slow"
                  ? "A few requests in a row. Give it a couple of minutes."
                  : "Please enter a valid email address."}
              </p>
            )}
            <form action={requestSvcPasswordReset} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className={svcLabel}>Email address</label>
                <input id="email" name="email" type="email" required autoComplete="email" className={`mt-2 ${svcInput}`} />
              </div>
              <button type="submit" className={svcBtnGreen}>
                Send me the link
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
