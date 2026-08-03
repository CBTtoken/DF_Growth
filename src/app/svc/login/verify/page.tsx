import type { Metadata } from "next";
import Link from "next/link";
import { svcPath } from "@/lib/svc/host";
import { verifyCellLogin } from "../actions";
import { svcBtnGreen, svcInput, svcLabel } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "Enter your code",
  robots: { index: false, follow: false },
};

const ERRORS: Record<string, string> = {
  invalid: "That code is not right. Check it and try again.",
  expired: "That code has expired. Request a fresh one from the login page.",
  attempts: "Too many wrong tries. Request a fresh code from the login page.",
  failed: "Something went wrong on our side. Please try again.",
};

export default async function LoginVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ cell?: string; error?: string }>;
}) {
  const params = await searchParams;
  const cell = params.cell ?? "";
  const loginHref = await svcPath("/login");

  return (
    <div className="bg-svc-cream px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <h1 className="font-svc-heading text-3xl font-bold">Enter your code</h1>
        <p className="mt-2 text-base leading-relaxed text-svc-ink/75">
          If {cell || "your number"} belongs to a member, a one-time code is on
          its way. Enter it below.
        </p>

        {params.error && (
          <p className="mt-6 border-2 border-svc-blue bg-white/60 p-4 text-sm leading-relaxed">
            {ERRORS[params.error] ?? ERRORS.failed}
          </p>
        )}

        <form action={verifyCellLogin} className="mt-8 space-y-5">
          <input type="hidden" name="cell" value={cell} />
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
          <button type="submit" className={svcBtnGreen}>
            Log me in
          </button>
        </form>

        <p className="mt-6 text-sm text-svc-ink/70">
          No code after a minute or two?{" "}
          <Link href={`${loginHref}?mode=cell`} className="font-semibold text-svc-blue underline">
            Start again
          </Link>
        </p>
      </div>
    </div>
  );
}
