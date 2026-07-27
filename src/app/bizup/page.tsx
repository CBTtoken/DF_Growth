import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getMyBizUpAccount } from "@/lib/bizup/account";
import { SiteFooter } from "@/components/SiteFooter";
import { BizUpLanding } from "@/components/bizup/landing/BizUpLanding";
import { BizUpFooter } from "@/components/bizup/landing/BizUpFooter";

// Private, signed-in-only — same reasoning as onboard/page.tsx.
// The signed-out view of this route is the public landing page, so it must
// be indexable. The signed-in dashboard below renders no member data to a
// crawler, since a crawler is never signed in.
export const metadata: Metadata = {
  title: "BizUp: send a quote that wins the job",
  description:
    "A professional quote with your logo and banking details, from your phone, in under a minute. Turn it into an invoice when the job is done. Free to start, no card needed.",
  alternates: { canonical: "https://bizup.digitalflyer.co.za" },
};

// BizUp's signed-in home, and the destination resolveLandingPath sends
// every BizUp member to. Intentionally thin for now: the quote and invoice
// surfaces arrive with build steps 4 onward (BizUp/docs/bizup-phase1-spec.md
// Sec 15). What it must already do correctly is never dead-end a valid
// login, which is exactly what used to happen to a member with no Growth
// account.
export default async function BizUpHomePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A visitor gets the landing page; a member gets their dashboard. Same
  // route either way, so bizup.digitalflyer.co.za is one address that does
  // the right thing rather than a marketing site with the app hidden
  // somewhere behind it.
  if (!user) {
    return (
      <>
        <BizUpLanding />
        <BizUpFooter />
      </>
    );
  }

  const account = await getMyBizUpAccount();

  // Signed in, but no BizUp account yet. Straight into setup rather than a
  // "no account found" wall.
  if (!account) redirect("/bizup/start");

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
        <header className="flex items-baseline justify-between">
          <span className="text-2xl font-bold tracking-tight text-ink">BizUp</span>
          <span className="text-sm text-gray-500">{account.businessName}</span>
        </header>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold tracking-tight text-ink">Your business is set up</h1>
          <p className="mt-1 text-sm text-gray-500">
            Quotes and invoices are being built. This is where they will live.
          </p>

          {/* Sec 15.1 lists banking details as part of account setup, and an
              invoice cannot be paid without them, so an account missing them
              is genuinely incomplete rather than merely unfinished. */}
          {!account.hasBankDetails && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
              <p className="text-sm font-semibold text-amber-900">Add your banking details</p>
              <p className="mt-1 text-sm text-amber-800">
                Your customers need these to pay you. They are encrypted, and only the last four
                digits are ever shown back to you.
              </p>
              <Link
                href="/bizup/settings/banking"
                className="mt-3 inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
              >
                Add banking details
              </Link>
            </div>
          )}
        </section>

        <nav className="flex flex-wrap gap-3 text-sm font-medium">
          <Link href="/bizup/quotes" className="text-brand underline-offset-2 hover:underline">
            Quotes
          </Link>
          <Link href="/bizup/invoices" className="text-brand underline-offset-2 hover:underline">
            Invoices
          </Link>
          <Link href="/bizup/customers" className="text-brand underline-offset-2 hover:underline">
            Customers
          </Link>
          <Link href="/bizup/price-list" className="text-brand underline-offset-2 hover:underline">
            Price list
          </Link>
          <Link href="/bizup/settings/business" className="text-brand underline-offset-2 hover:underline">
            Business details
          </Link>
          <Link href="/bizup/settings/banking" className="text-brand underline-offset-2 hover:underline">
            Banking details
          </Link>
          {/* A member who also holds a Growth account can cross over. The
              link is only rendered when they actually have one, so it is
              never an advert dressed up as navigation. */}
          {account.growthClientId && (
            <Link href="/dashboard" className="text-gray-500 underline-offset-2 hover:text-brand hover:underline">
              Go to DigitalFlyer Growth
            </Link>
          )}
        </nav>
      </div>
      <SiteFooter />
    </main>
  );
}
