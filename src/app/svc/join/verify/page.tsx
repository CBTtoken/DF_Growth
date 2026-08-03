import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { svcPath } from "@/lib/svc/host";
import { getCurrentMember } from "@/lib/svc/member";
import { verifySignupOtp, resendSignupOtp } from "../actions";
import { svcBtnPrimary, svcInput, svcLabel } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "Verify your cell number",
  robots: { index: false, follow: false },
};

const ERRORS: Record<string, string> = {
  format: "The code is the 6 digits from the message we sent you.",
  invalid: "That code is not right. Check it and try again.",
  expired: "That code has expired. Send yourself a fresh one below.",
  attempts: "Too many wrong tries with that code. Send yourself a fresh one below.",
  slow: "A few resends in a row. Give it a couple of minutes.",
  failed: "Something went wrong on our side. Please try again.",
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ package?: string; error?: string; resent?: string; ref?: string }>;
}) {
  const params = await searchParams;
  const ref = (params.ref ?? "").toUpperCase().slice(0, 16);
  const member = await getCurrentMember();
  if (!member) redirect(await svcPath("/join"));
  if (member.cell_verified_at) {
    redirect(`${await svcPath("/join/checkout")}?package=${params.package ?? "svc-membership"}`);
  }

  const pkg = params.package ?? "svc-membership";

  return (
    <div className="bg-svc-cream px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <h1 className="font-svc-heading text-3xl font-bold">Verify your cell number</h1>
        <p className="mt-2 text-base leading-relaxed text-svc-ink/75">
          We sent a 6 digit code for {member.cell_number}. Enter it here and
          your number is confirmed.
        </p>

        {params.resent && (
          <p className="mt-6 border-2 border-svc-green bg-white/60 p-4 text-sm">A fresh code is on its way.</p>
        )}
        {params.error && (
          <p className="mt-6 border-2 border-svc-blue bg-white/60 p-4 text-sm leading-relaxed">
            {ERRORS[params.error] ?? ERRORS.failed}
          </p>
        )}

        <form action={verifySignupOtp} className="mt-8 space-y-5">
          <input type="hidden" name="package" value={pkg} />
          {ref && <input type="hidden" name="ref" value={ref} />}
          <div>
            <label htmlFor="code" className={svcLabel}>Your 6 digit code</label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoComplete="one-time-code"
              className={`mt-2 ${svcInput} text-center text-2xl tracking-[0.5em]`}
            />
          </div>
          <button type="submit" className={svcBtnPrimary}>
            Confirm my number
          </button>
        </form>

        <form action={resendSignupOtp} className="mt-4">
          <input type="hidden" name="package" value={pkg} />
          {ref && <input type="hidden" name="ref" value={ref} />}
          <button type="submit" className="min-h-12 text-sm font-semibold text-svc-blue underline">
            Send me a fresh code
          </button>
        </form>
      </div>
    </div>
  );
}
