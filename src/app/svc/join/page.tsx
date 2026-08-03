import type { Metadata } from "next";
import Link from "next/link";
import { svcPath } from "@/lib/svc/host";
import { getPackageBySlug, formatRand } from "@/lib/svc/data";
import { startSignup } from "./actions";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";
import { svcBtnPrimary, svcInput, svcLabel } from "@/components/svc/ui";

// Member-area route: noindex in metadata as well as the proxy header.
export const metadata: Metadata = {
  title: "Join",
  robots: { index: false, follow: false },
};

const ERRORS: Record<string, string> = {
  missing: "Please fill in every field.",
  weak: "Your password needs at least 8 characters.",
  popia: "We need your consent to process your details before we can create your membership.",
  cell: "That does not look like a South African cell number. Use the format 082 123 4567.",
  cell_exists: "That cell number already belongs to a member. Log in instead.",
  email_exists: "That email address already has an account, but the password did not match. Log in or reset your password.",
  verify: "The security check did not pass. Please try again.",
  slow: "A few attempts in a row. Give it a couple of minutes and try again.",
  otp_failed: "We could not send your verification code. Please try again.",
  failed: "Something went wrong on our side. Please try again.",
};

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ package?: string; error?: string }>;
}) {
  const params = await searchParams;
  const slug = params.package ?? "svc-membership";
  const pkg = await getPackageBySlug(slug);
  const loginHref = await svcPath("/login");

  return (
    <div className="bg-svc-cream px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="font-svc-heading text-3xl font-bold">Join Smart Value Club</h1>
        {pkg ? (
          <p className="mt-2 text-base leading-relaxed text-svc-ink/75">
            {pkg.name}, {formatRand(pkg.monthly_price_cents)} a month. Cancel anytime.
          </p>
        ) : (
          <p className="mt-2 text-base leading-relaxed text-svc-ink/75">
            Create your account first; you will choose your package at the
            payment step.
          </p>
        )}

        {params.error && (
          <p className="mt-6 border-2 border-svc-blue bg-white/60 p-4 text-sm leading-relaxed">
            {ERRORS[params.error] ?? ERRORS.failed}{" "}
            {(params.error === "cell_exists" || params.error === "email_exists") && (
              <Link href={loginHref} className="font-semibold text-svc-blue underline">
                Go to login
              </Link>
            )}
          </p>
        )}

        <form action={startSignup} className="mt-8 space-y-5">
          <input type="hidden" name="package" value={slug} />
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className={svcLabel}>First name</label>
              <input id="firstName" name="firstName" type="text" required autoComplete="given-name" className={`mt-2 ${svcInput}`} />
            </div>
            <div>
              <label htmlFor="surname" className={svcLabel}>Surname</label>
              <input id="surname" name="surname" type="text" required autoComplete="family-name" className={`mt-2 ${svcInput}`} />
            </div>
          </div>
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
            <p className="mt-1 text-xs text-svc-ink/60">
              Your cell number is your membership number. We verify it with a
              one-time code.
            </p>
          </div>
          <div>
            <label htmlFor="email" className={svcLabel}>Email address</label>
            <input id="email" name="email" type="email" required autoComplete="email" className={`mt-2 ${svcInput}`} />
          </div>
          <div>
            <label htmlFor="password" className={svcLabel}>Choose a password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={`mt-2 ${svcInput}`}
            />
          </div>

          <label className="flex items-start gap-3 text-sm leading-relaxed">
            <input type="checkbox" name="popia" required className="mt-1 h-5 w-5 shrink-0 accent-svc-green" />
            <span>
              I consent to Smart Value Club processing my personal information
              to run my membership, as described in the privacy policy and
              POPIA notice.
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm leading-relaxed">
            <input type="checkbox" name="marketing" className="mt-1 h-5 w-5 shrink-0 accent-svc-green" />
            <span>
              You may also send me news and offers about SVC benefits. Optional,
              and you can change it anytime.
            </span>
          </label>

          <TurnstileWidget siteKey={process.env.NEXT_PUBLIC_SVC_TURNSTILE_SITE_KEY} />

          <button type="submit" className={svcBtnPrimary}>
            Create my account
          </button>
          <p className="text-sm text-svc-ink/70">
            Already a member?{" "}
            <Link href={loginHref} className="font-semibold text-svc-blue underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
