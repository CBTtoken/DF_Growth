import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getMyBizUpAccount } from "@/lib/bizup/account";
import { SiteFooter } from "@/components/SiteFooter";
import { BizUpHeader } from "@/components/bizup/landing/BizUpHeader";
import { GrowthFromBizUp } from "@/components/bizup/BizUpCrossSell";
import { SetupProgress } from "@/components/bizup/SetupProgress";
import { BizUpHome } from "@/components/bizup/BizUpHome";
import { getHomeSummary } from "@/lib/bizup/home";
import { createAdminClient } from "@/lib/supabase/admin";
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
        <BizUpHeader />
        <BizUpLanding />
        <BizUpFooter />
      </>
    );
  }

  const account = await getMyBizUpAccount();

  // Signed in, but no BizUp account yet. Straight into setup rather than a
  // "no account found" wall.
  if (!account) redirect("/bizup/start");

  const admin = createAdminClient();
  const { data: planRow } = await admin
    .from("bizup_accounts")
    .select("plan, topup_balance")
    .eq("id", account.id)
    .single();

  // Falls back to the free tier's limits rather than failing the page if
  // the row cannot be read. A member seeing a conservative cap is a far
  // better outcome than a member seeing an error screen.
  const summary = await getHomeSummary(
    account.id,
    planRow?.plan ?? "free",
    planRow?.topup_balance ?? 0,
  );

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 p-5">
        {/* Setup first while it is unfinished, since a member who has not
            added their banking details has a more pressing job than reading
            their numbers. It removes itself once the first document is
            sent. */}
        <SetupProgress
          state={{
            hasBusinessDetails: account.hasBusinessDetails,
            hasBankDetails: account.hasBankDetails,
            hasSentDocument: account.hasSentDocument,
          }}
        />

        <BizUpHome summary={summary} />

        {account.growthClientId && (
          <Link
            href="/dashboard"
            className="text-center text-xs font-medium text-gray-500 underline-offset-2 hover:text-brand hover:underline"
          >
            Go to DigitalFlyer Growth
          </Link>
        )}

        {/* Cross-sell, and only to someone who does not already pay for
            Growth. Advertising it to an existing Growth member would be
            noise on their own dashboard. */}
        {!account.growthClientId && <GrowthFromBizUp />}
      </div>
      <SiteFooter />
    </main>
  );
}
