import type { Metadata } from "next";
import Link from "next/link";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { logOutOfBizUp } from "@/app/bizup/actions";
import { SignupForm } from "@/components/bizup/landing/SignupForm";
import { BizUpFooter } from "@/components/bizup/landing/BizUpFooter";
import { PixelConsentGate } from "@/components/landing/PixelConsentGate";

// Site audit, 28 July 2026: this page inherited the root layout's tags, so
// a signup link shared on WhatsApp previewed as "DigitalFlyer Growth" with
// Growth's logo, fetched from Growth's domain. The homepage was fixed for
// exactly this reason and the signup page was missed, which is the worse
// miss of the two: it is the link an early member actually forwards to a
// friend, and it is the destination of every ad.
const SIGNUP_DESCRIPTION =
  "Four things and you are in. No card, and you can send your first quote straight away.";

// The same generated card the homepage uses, from src/app/bizup/
// opengraph-image.tsx. Named explicitly because overriding openGraph below
// replaces the inherited block wholesale, images included: the first
// version of this fix corrected the title and silently left the page with
// no share picture at all, which a WhatsApp preview shows as a bare link.
// Relative, so it resolves against the metadataBase set below rather than
// against Growth's domain.
const SHARE_IMAGE = {
  url: "https://katisobiz.co.za/opengraph-image",
  width: 1200,
  height: 630,
  alt: "KatisoBiz",
};

export const metadata: Metadata = {
  // Overrides the root layout's metadataBase, which is Growth's domain.
  // Without it the share image resolves to growth.digitalflyersa.co.za.
  metadataBase: new URL("https://katisobiz.co.za"),
  // Absolute, so the root layout's "| DigitalFlyer Growth" suffix is not
  // appended to a KatisoBiz page.
  title: { absolute: "Start free on KatisoBiz" },
  description: SIGNUP_DESCRIPTION,
  alternates: { canonical: "https://katisobiz.co.za/signup" },
  openGraph: {
    type: "website",
    siteName: "KatisoBiz",
    title: "Start free on KatisoBiz",
    description: SIGNUP_DESCRIPTION,
    url: "https://katisobiz.co.za/signup",
    locale: "en_ZA",
    images: [SHARE_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Start free on KatisoBiz",
    description: SIGNUP_DESCRIPTION,
    images: [SHARE_IMAGE.url],
  },
};

// Landing copy, conversion note 1: every button on the page does the same
// thing, and this is where they all land.
export default async function BizUpSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
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
              KatisoBiz
            </Link>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-neutral-ink">
              Create your first quote free
            </h1>
            <p className="mt-2 text-sm text-neutral-mid">
              Four things and you are in. No card, and you can send your first quote straight away.
            </p>
          </div>

          {/* Dewald, testing: he was already logged in and hit a signup form
              with no way out, because KatisoBiz had no log out anywhere. Handing
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
              <SignupForm plan={plan} />
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
      {/* This page carries no header, so it does not inherit the pixel the
          way the landing page does. It needs its own, because an ad can
          point straight here: without it such a visitor would sign up
          having never had a _fbc cookie set, and Meta would never learn
          which ad earned them. */}
      <PixelConsentGate pixelId={process.env.NEXT_PUBLIC_DIGITALFLYER_META_PIXEL_ID ?? null} />
    </>
  );
}
