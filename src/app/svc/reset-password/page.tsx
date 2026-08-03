import type { Metadata } from "next";
import { resetSvcPassword } from "./actions";
import { svcBtnGreen, svcInput, svcLabel } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

export default async function SvcResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="bg-svc-cream px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <h1 className="font-svc-heading text-3xl font-bold">Choose a new password</h1>
        {params.error && (
          <p className="mt-6 border-2 border-svc-blue bg-white/60 p-4 text-sm leading-relaxed">
            {params.error === "mismatch" && "The two passwords do not match."}
            {params.error === "weak" && "Your password needs at least 8 characters."}
            {params.error === "expired" && "That reset link has expired or been used. Request a new one."}
            {params.error === "failed" && "Something went wrong on our side. Please try again."}
          </p>
        )}
        <form action={resetSvcPassword} className="mt-8 space-y-5">
          <div>
            <label htmlFor="password" className={svcLabel}>New password</label>
            <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className={`mt-2 ${svcInput}`} />
          </div>
          <div>
            <label htmlFor="confirm" className={svcLabel}>The same password again</label>
            <input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" className={`mt-2 ${svcInput}`} />
          </div>
          <button type="submit" className={svcBtnGreen}>
            Save my new password
          </button>
        </form>
      </div>
    </div>
  );
}
