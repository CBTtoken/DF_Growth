import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MoxieHeader, MoxieFooter } from "@/components/moxie/Chrome";
import { getReader } from "@/lib/moxie/entitlement";
import { moxiePath } from "@/lib/moxie/host";
import { signIn, signUp } from "./actions";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

const ERRORS: Record<string, string> = {
  missing: "Enter your email address and your password.",
  invalid: "That email address and password do not match an account.",
  weak: "Use a password of at least 8 characters.",
  failed: "Something went wrong creating your account. Try again in a moment.",
  exists: "There is already an account with that email address. Sign in instead.",
};

export default async function MoxieLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; error?: string; next?: string }>;
}) {
  const { mode, error, next = "/editions" } = await searchParams;
  const reader = await getReader();
  if (reader) redirect(await moxiePath("/account"));

  const joining = mode === "join";
  const action = joining ? signUp : signIn;
  const otherHref = await moxiePath(
    `/login?${joining ? "" : "mode=join&"}next=${encodeURIComponent(next)}`
  );

  return (
    <main className="flex flex-1 flex-col">
      <MoxieHeader />

      <section className="flex flex-1 items-center bg-moxie-cream">
        <div className="mx-auto w-full max-w-md px-5 py-16 sm:px-8">
          <p className="font-moxie-label text-xs font-bold uppercase tracking-[0.22em] text-moxie-orange">
            {joining ? "Create a free account" : "Welcome back"}
          </p>
          <h1 className="font-moxie-display mt-3 text-3xl leading-tight font-bold text-moxie-charcoal">
            {joining ? "Read Moxie" : "Sign in to read"}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-moxie-charcoal/70">
            {joining
              ? "A free account opens every edition older than 60 days. Members read each new edition the day it comes out."
              : "Signing in opens every edition you have access to."}
          </p>

          {error && ERRORS[error] && (
            <p className="mt-6 border-l-[3px] border-moxie-orange bg-white p-4 text-sm text-moxie-charcoal">
              {ERRORS[error]}
            </p>
          )}

          <form action={action} className="mt-8 flex flex-col gap-4">
            <input type="hidden" name="next" value={next} />
            <label className="flex flex-col gap-1.5">
              <span className="font-moxie-label text-xs font-bold uppercase tracking-[0.16em] text-moxie-charcoal/70">
                Email address
              </span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="border border-moxie-border bg-white px-4 py-3 text-base text-moxie-charcoal outline-none transition focus:border-moxie-orange"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-moxie-label text-xs font-bold uppercase tracking-[0.16em] text-moxie-charcoal/70">
                Password
              </span>
              <input
                type="password"
                name="password"
                required
                minLength={joining ? 8 : undefined}
                autoComplete={joining ? "new-password" : "current-password"}
                className="border border-moxie-border bg-white px-4 py-3 text-base text-moxie-charcoal outline-none transition focus:border-moxie-orange"
              />
            </label>
            <button
              type="submit"
              className="font-moxie-label mt-2 bg-moxie-orange px-7 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-moxie-orange/85"
            >
              {joining ? "Create my account" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-sm text-moxie-charcoal/70">
            {joining ? "Already have an account? " : "No account yet? "}
            <Link href={otherHref} className="font-bold text-moxie-orange underline">
              {joining ? "Sign in" : "Create one, it is free"}
            </Link>
          </p>
        </div>
      </section>

      <MoxieFooter />
    </main>
  );
}
