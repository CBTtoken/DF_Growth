import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MoxieHeader, MoxieFooter } from "@/components/moxie/Chrome";
import { getMembership, getReader } from "@/lib/moxie/entitlement";
import { moxiePath } from "@/lib/moxie/host";
import { changePassword, signOut } from "../login/actions";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function formatDate(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ password?: string }>;
}) {
  const { password: passwordResult } = await searchParams;
  const reader = await getReader();
  if (!reader) redirect(await moxiePath("/login?next=/account"));

  const PASSWORD_MESSAGES: Record<string, { ok: boolean; text: string }> = {
    changed: { ok: true, text: "Your password is changed. It works everywhere you sign in with this address." },
    weak: { ok: false, text: "The new password needs at least 8 characters." },
    mismatch: { ok: false, text: "The two new passwords did not match. Nothing was changed." },
    wrong: { ok: false, text: "The current password was not right. Nothing was changed." },
    failed: { ok: false, text: "Could not change it just now. Try again." },
  };
  const passwordMessage = passwordResult ? PASSWORD_MESSAGES[passwordResult] : undefined;

  const membership = await getMembership(reader.id);
  const [editionsHref, subscribeHref] = await Promise.all([
    moxiePath("/editions"),
    moxiePath("/subscribe"),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <MoxieHeader signedIn />

      <section className="flex-1 bg-moxie-cream">
        <div className="mx-auto w-full max-w-2xl px-5 py-14 sm:px-8">
          <p className="font-moxie-label text-base font-bold uppercase tracking-[0.2em] text-moxie-orange">
            My account
          </p>
          <h1 className="font-moxie-display mt-2 text-2xl font-bold break-all text-moxie-charcoal sm:text-3xl">
            {reader.email}
          </h1>

          <div className="mt-8 border border-moxie-border bg-white p-7">
            <p className="font-moxie-label text-xs font-bold uppercase tracking-[0.18em] text-moxie-charcoal/60">
              Membership
            </p>

            {membership ? (
              <>
                <p className="font-moxie-display mt-2 text-2xl font-bold text-moxie-charcoal">
                  {membership.interval === "annual" ? "Annual" : "Monthly"} membership
                </p>
                <dl className="mt-4 flex flex-col gap-2 text-sm text-moxie-charcoal/75">
                  <div className="flex justify-between gap-4">
                    <dt>Started</dt>
                    <dd className="font-medium">{formatDate(membership.started_at)}</dd>
                  </div>
                  {membership.current_period_end && (
                    <div className="flex justify-between gap-4">
                      <dt>{membership.status === "past_due" ? "Was due" : "Renews"}</dt>
                      <dd className="font-medium">{formatDate(membership.current_period_end)}</dd>
                    </div>
                  )}
                </dl>

                {membership.status === "past_due" && (
                  <p className="mt-4 border-l-[3px] border-moxie-orange bg-moxie-cream p-4 text-sm text-moxie-charcoal">
                    The last payment did not go through. Your reading is not interrupted while
                    the card is retried. If it keeps failing, email editor@moxiemag.co.za.
                  </p>
                )}

                <p className="mt-5 text-sm leading-relaxed text-moxie-charcoal/70">
                  You get every edition published on or after {formatDate(membership.started_at)}.
                  Older editions open to every signed-in reader 60 days after publication.
                </p>

                {/* No self-service cancel button, and this is not an
                    oversight. Cancelling a Paystack subscription needs the
                    email token flow, and a button that looks like it
                    cancelled but did not is worse than no button. Until that
                    is built, one clear address. */}
                <p className="mt-5 text-sm text-moxie-charcoal/60">
                  To cancel, email editor@moxiemag.co.za and it is done the same day.
                </p>
              </>
            ) : (
              <>
                <p className="font-moxie-display mt-2 text-2xl font-bold text-moxie-charcoal">
                  Free reader
                </p>
                <p className="mt-3 text-sm leading-relaxed text-moxie-charcoal/70">
                  You can read every edition older than 60 days. Members read each new edition
                  the day it comes out.
                </p>
                <Link
                  href={subscribeHref}
                  className="font-moxie-label mt-6 inline-flex bg-moxie-orange px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-moxie-orange/85"
                >
                  Become a member
                </Link>
              </>
            )}
          </div>

          {/* Changing the password, on the page a person already thinks of
              as "my account". Matters doubly for team accounts, which
              arrive with a password somebody else typed. */}
          <div className="mt-8 border border-moxie-border bg-white p-7">
            <p className="font-moxie-label text-xs font-bold uppercase tracking-[0.18em] text-moxie-charcoal/60">
              Change your password
            </p>

            {passwordMessage && (
              <p
                className={`mt-4 border-l-[3px] p-4 text-sm text-moxie-charcoal ${
                  passwordMessage.ok ? "border-moxie-teal bg-moxie-cream" : "border-moxie-orange bg-moxie-cream"
                }`}
              >
                {passwordMessage.text}
              </p>
            )}

            <form action={changePassword} className="mt-4 flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="font-moxie-label text-[0.62rem] font-bold uppercase tracking-[0.14em] text-moxie-charcoal/60">
                  Current password
                </span>
                <input
                  type="password"
                  name="current"
                  required
                  autoComplete="current-password"
                  className="border border-moxie-border bg-white px-3 py-2.5 text-sm text-moxie-charcoal outline-none focus:border-moxie-orange"
                />
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="flex flex-1 flex-col gap-1" style={{ minWidth: "12rem" }}>
                  <span className="font-moxie-label text-[0.62rem] font-bold uppercase tracking-[0.14em] text-moxie-charcoal/60">
                    New password, at least 8 characters
                  </span>
                  <input
                    type="password"
                    name="fresh"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="border border-moxie-border bg-white px-3 py-2.5 text-sm text-moxie-charcoal outline-none focus:border-moxie-orange"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1" style={{ minWidth: "12rem" }}>
                  <span className="font-moxie-label text-[0.62rem] font-bold uppercase tracking-[0.14em] text-moxie-charcoal/60">
                    The same again
                  </span>
                  <input
                    type="password"
                    name="again"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="border border-moxie-border bg-white px-3 py-2.5 text-sm text-moxie-charcoal outline-none focus:border-moxie-orange"
                  />
                </label>
              </div>
              <button
                type="submit"
                className="font-moxie-label self-start bg-moxie-charcoal px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-moxie-charcoal/85"
              >
                Change it
              </button>
            </form>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <Link
              href={editionsHref}
              className="font-moxie-label text-xs font-bold uppercase tracking-[0.16em] text-moxie-orange"
            >
              Browse every edition
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="font-moxie-label text-xs font-bold uppercase tracking-[0.16em] text-moxie-charcoal/60 transition hover:text-moxie-charcoal"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </section>

      <MoxieFooter />
    </main>
  );
}
