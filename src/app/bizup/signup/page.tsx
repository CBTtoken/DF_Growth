import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/bizup/landing/SignupForm";
import { BizUpFooter } from "@/components/bizup/landing/BizUpFooter";

export const metadata: Metadata = {
  title: "Start free on BizUp",
  description: "Four fields and you are in. No card needed.",
};

// Landing copy, conversion note 1: every button on the page does the same
// thing, and this is where they all land.
export default function BizUpSignupPage() {
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

          <div className="rounded-2xl border border-neutral-border bg-white p-6 shadow-card">
            <SignupForm />
          </div>

          <p className="text-center text-sm text-neutral-muted">
            Already have an account?{" "}
            <Link href="/bizup/login" className="font-semibold text-brand-blue hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </main>
      <BizUpFooter />
    </>
  );
}
