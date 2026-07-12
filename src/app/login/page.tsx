"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { SiteFooter } from "@/components/SiteFooter";

// Found via real UAT: there was no way for an existing client to get back
// into their dashboard without still having their original signup email
// handy — no persistent "Log in" link anywhere, and no self-serve way to
// request a new one. signInWithOtp works for any existing account (and,
// harmlessly, would create one for an email with no account — but this page
// is only ever linked to from places an existing client would find it, not
// advertised as a signup path).
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      // Sprint 1 fix, Section 1 — see src/app/auth/callback/page.tsx's own
      // comment for why this can no longer point straight at /onboard.
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
      <BrandHeader />
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        {status === "sent" ? (
          <>
            <span className="grid size-12 place-items-center rounded-full bg-brand/10 text-2xl text-brand">✓</span>
            <h1 className="text-xl font-bold tracking-tight text-ink">Check your email</h1>
            <p className="text-sm text-gray-500">
              We&apos;ve sent a sign-in link to <strong>{email}</strong> — click it to get back into your
              dashboard.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold tracking-tight text-ink">Log in</h1>
            <p className="text-sm text-gray-500">
              Enter the email you signed up with and we&apos;ll send you a link straight in — no password needed.
            </p>
            <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.co.za"
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              {status === "error" && (
                <p className="text-xs text-red-600">Something went wrong — please try again.</p>
              )}
              <button
                type="submit"
                disabled={status === "sending"}
                className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {status === "sending" ? "Sending..." : "Send me a link"}
              </button>
            </form>
          </>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
