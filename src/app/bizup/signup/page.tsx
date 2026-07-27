import type { Metadata } from "next";
import Link from "next/link";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { logOutOfBizUp } from "@/app/bizup/actions";
import { SignupForm } from "@/components/bizup/landing/SignupForm";
import { BizUpFooter } from "@/components/bizup/landing/BizUpFooter";

export const metadata: Metadata = {
  title: "Start free on BizUp",
  description: "Four fields and you are in. No card needed.",
};

// Landing copy, conversion note 1: every button on the page does the same
// thing, and this is where they all land.
export default async function BizUpSignupPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <main className="flex flex-1 flex-col bg-gradient-to-br from-brand-blue-light via-white to-white">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-6 py-12">
          <div>
            <Link href="/bizup" className="text-2xl font-extrabold tracking-tight text-neutral-ink">
              BizUp
            </Link>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-neutral-ink">
              Create your first quote free
            </h1>
            <p className="mt-2 text-sm text-neutral-mid">
              Four things and you are in. No card, and you can send your first quote straight away.
            </p>
          </div>

          {/* Dewald, testing: he was already logged in and hit a signup form
              with no way out, because BizUp had no log out anywhere. Handing
              someone a blank signup form while they hold a live session is a
              dead end, so say who they are and give them both doors. */}
          {user ? (
            <div className="rounded-2xl border border-neutral-border bg-white p-6 shadow-card">
              <p className="text-sm font-bold text-neutral-ink">You are already logged in</p>
              <p className="mt-1 text-sm text-neutral-mid">
                As <strong>{user.email}</strong>. Carry on with that account, or log out to make a
                different one.
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <Link href="/bizup" className="btn-accent-lg w-full">
                  Continue as {user.email}
                </Link>
                <form action={logOutOfBizUp}>
                  <button
                    type="submit"
                    className="w-full text-sm font-semibold text-neutral-mid underline-offset-2 hover:text-brand-blue hover:underline"
                  >
                    Log out and start a different account
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-border bg-white p-6 shadow-card">
              <SignupForm />
            </div>
          )}

          {!user && (
            <p className="text-center text-sm text-neutral-muted">
              Already have an account?{" "}
              <Link href="/bizup/login" className="font-semibold text-brand-blue hover:underline">
                Log in
              </Link>
            </p>
          )}
        </div>
      </main>
      <BizUpFooter />
    </>
  );
}
