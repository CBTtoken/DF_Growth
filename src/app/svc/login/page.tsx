import type { Metadata } from "next";
import Link from "next/link";
import { svcPath } from "@/lib/svc/host";
import { signInWithEmail, startCellLogin } from "./actions";
import { svcBtnGreen, svcBtnOutline, svcInput, svcLabel } from "@/components/svc/ui";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: false },
};

const ERRORS: Record<string, string> = {
  missing: "Fill in your email and password.",
  invalid: "That did not match. Check your details and try again.",
  cell: "That does not look like a South African cell number.",
  slow: "A few attempts in a row. Give it a couple of minutes.",
  failed: "Something went wrong on our side. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; error?: string }>;
}) {
  const params = await searchParams;

  // Already signed in? There is nothing to log into: members go to their
  // dashboard, memberless admins to admin. Showing the form to an
  // authenticated visitor is what made ordinary navigation read as
  // "logged out, log in again".
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { getMemberByAuthUser } = await import("@/lib/svc/member");
    const { redirect } = await import("next/navigation");
    const member = await getMemberByAuthUser(user.id);
    if (member) redirect(await svcPath("/account"));
    const { getSvcAdmin } = await import("@/lib/svc/admin");
    if (await getSvcAdmin()) redirect(await svcPath("/admin"));
    redirect(await svcPath("/account"));
  }
  const cellMode = params.mode === "cell";
  const joinHref = await svcPath("/join");
  const loginHref = await svcPath("/login");
  const forgotHref = await svcPath("/forgot-password");

  return (
    <div className="bg-svc-cream px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <h1 className="font-svc-heading text-3xl font-bold">Log in</h1>
        <p className="mt-2 text-base leading-relaxed text-svc-ink/75">
          {cellMode
            ? "We will send a one-time code for your cell number."
            : "Use your email and password, or your cell number instead."}
        </p>

        {params.error && (
          <p className="mt-6 border-2 border-svc-blue bg-white/60 p-4 text-sm leading-relaxed">
            {ERRORS[params.error] ?? ERRORS.failed}
          </p>
        )}

        {cellMode ? (
          <>
            <form action={startCellLogin} className="mt-8 space-y-5">
              <div>
                <label htmlFor="cell" className={svcLabel}>Cell number</label>
                <input
                  id="cell"
                  name="cell"
                  type="tel"
                  required
                  autoComplete="tel"
                  inputMode="numeric"
                  placeholder="082 123 4567"
                  className={`mt-2 ${svcInput}`}
                />
              </div>
              <button type="submit" className={svcBtnGreen}>
                Send my code
              </button>
            </form>
            <div className="mt-4">
              <Link href={loginHref} className={svcBtnOutline}>
                Use email and password instead
              </Link>
            </div>
          </>
        ) : (
          <>
            <form action={signInWithEmail} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className={svcLabel}>Email address</label>
                <input id="email" name="email" type="email" required autoComplete="email" className={`mt-2 ${svcInput}`} />
              </div>
              <div>
                <label htmlFor="password" className={svcLabel}>Password</label>
                <input id="password" name="password" type="password" required autoComplete="current-password" className={`mt-2 ${svcInput}`} />
              </div>
              <button type="submit" className={svcBtnGreen}>
                Log in
              </button>
            </form>
            <div className="mt-4">
              <Link href={`${loginHref}?mode=cell`} className={svcBtnOutline}>
                Log in with my cell number
              </Link>
            </div>
            <p className="mt-4 text-sm text-svc-ink/70">
              <Link href={forgotHref} className="font-semibold text-svc-blue underline">
                Forgotten your password?
              </Link>
            </p>
          </>
        )}

        <p className="mt-8 border-t-2 border-svc-ink/10 pt-6 text-sm text-svc-ink/70">
          Not a member yet?{" "}
          <Link href={joinHref} className="font-semibold text-svc-blue underline">
            Join Smart Value Club
          </Link>
        </p>
      </div>
    </div>
  );
}
