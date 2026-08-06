import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getMyBizUpAccount } from "@/lib/bizup/account";
import { SiteFooter } from "@/components/SiteFooter";
import { BizUpHeader } from "@/components/bizup/landing/BizUpHeader";
import { GrowthFromBizUp } from "@/components/bizup/BizUpCrossSell";
import { SetupButton } from "@/components/bizup/SetupButton";
import { BizUpHome } from "@/components/bizup/BizUpHome";
import { getHomeSummary } from "@/lib/bizup/home";
import { createAdminClient } from "@/lib/supabase/admin";
import { BizUpLanding } from "@/components/bizup/landing/BizUpLanding";
import { BizUpFooter } from "@/components/bizup/landing/BizUpFooter";
import { WebsiteQuestion } from "@/components/bizup/WebsiteQuestion";
import { ReviewWedge } from "@/components/bizup/ReviewWedge";
import { QuoteNudge } from "@/components/bizup/QuoteNudge";
import { isDismissed, getPublishedReviewCount, getQuoteStats, QUOTE_NUDGE_THRESHOLD } from "@/lib/bizup/nudges";

// Private, signed-in-only — same reasoning as onboard/page.tsx.
// The signed-out view of this route is the public landing page, so it must
// be indexable. The signed-in dashboard below renders no member data to a
// crawler, since a crawler is never signed in.
const KATISO_DESCRIPTION =
  "A professional quote with your logo and banking details, from your phone, in under a minute. Turn it into an invoice when the job is done. Free to start, no card needed.";

export const metadata: Metadata = {
  // Overrides the root layout metadataBase, which is Growth's domain.
  // Without this the generated share image resolved to
  // growth.digitalflyersa.co.za, so a WhatsApp preview for a KatisoBiz
  // link fetched its picture from another product's domain.
  metadataBase: new URL("https://katisobiz.co.za"),
  // Absolute, so the root layout's "| DigitalFlyer Growth" suffix is not
  // appended. On KatisoBiz's own domain the product's name should be the
  // whole title, and a suffix naming a different product reads as a
  // mistake in a search result.
  title: { absolute: "KatisoBiz: send a quote that wins the job" },
  description: KATISO_DESCRIPTION,
  alternates: { canonical: "https://katisobiz.co.za" },
  // Without these, the root layout's Growth tags were inherited, so a
  // member sharing katisobiz.co.za on WhatsApp got a preview titled
  // "DigitalFlyer Growth" with the Growth logo. WhatsApp sharing is the
  // main way this product spreads, which made it the worst possible place
  // to be showing another product's name.
  openGraph: {
    type: "website",
    siteName: "KatisoBiz",
    title: "KatisoBiz: send a quote that wins the job",
    description: KATISO_DESCRIPTION,
    url: "https://katisobiz.co.za",
    locale: "en_ZA",
  },
  twitter: {
    card: "summary_large_image",
    title: "KatisoBiz: send a quote that wins the job",
    description: KATISO_DESCRIPTION,
  },
};

// KatisoBiz's signed-in home, and the destination resolveLandingPath sends
// every KatisoBiz member to. Intentionally thin for now: the quote and invoice
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
  // route either way, so katisobiz.co.za is one address that does
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

  // Signed in, but no KatisoBiz account yet. Straight into setup rather than a
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

  // Jobs 4, 5, 6 (scripts/handoff-activation-nudges-and-emails.md): all
  // three prompts are exclusive to a member with no linked Growth account
  // — showing them to someone who already pays for Growth would be noise
  // on their own dashboard, same reasoning GrowthFromBizUp already uses.
  // Skipped entirely for a linked account rather than queried and then
  // hidden, since none of this data means anything once they're linked.
  let showWebsiteQuestion = false;
  let reviewCount = 0;
  let quoteStats = { sentCount: 0, wonCount: 0 };
  let showReviewWedge = false;
  let showQuoteNudge = false;

  if (!account.growthClientId) {
    // eslint-disable-next-line react-hooks/purity -- async Server Component, re-executes fully per request, no stale-render risk (same reasoning as dashboard/page.tsx's own use of Date.now() here)
    const now = Date.now();
    const [{ data: nudgeState }, reviews, quotes] = await Promise.all([
      admin
        .from("bizup_accounts")
        .select("website_status, website_status_dismissed_at, review_wedge_dismissed_at, quote_nudge_dismissed_at")
        .eq("id", account.id)
        .single(),
      getPublishedReviewCount(account.id),
      getQuoteStats(account.id),
    ]);

    showWebsiteQuestion = !nudgeState?.website_status && !nudgeState?.website_status_dismissed_at;
    reviewCount = reviews;
    quoteStats = quotes;
    showReviewWedge = reviewCount >= 1 && !isDismissed(nudgeState?.review_wedge_dismissed_at ?? null, now);
    showQuoteNudge =
      quoteStats.sentCount >= QUOTE_NUDGE_THRESHOLD &&
      !isDismissed(nudgeState?.quote_nudge_dismissed_at ?? null, now);
  }

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 p-5">
        {/* Setup is passed into BizUpHome rather than rendered above it,
            because it has to sit below the action buttons.
            Dewald's photo of his own phone, 29 July: the checklist filled
            the entire first screen and the buttons he had asked to be first
            were somewhere below three stat cards. A reminder about banking
            details is worth keeping, but not at the cost of the one thing
            he opened the app to do.

            It is now one button rather than the old three-step checklist,
            at his ask: the detail belongs on the settings page, and the
            home screen only needs to say that something is outstanding.

            Only once they have sent something. Before that, BizUpHome shows
            a first-run screen that already covers the same ground. */}
        <BizUpHome
          summary={summary}
          hasSentDocument={account.hasSentDocument}
          setup={
            account.hasSentDocument ? (
              <SetupButton
                hasBusinessDetails={account.hasBusinessDetails}
                hasBankDetails={account.hasBankDetails}
              />
            ) : null
          }
        />

        {account.growthClientId && (
          <Link
            href="/dashboard"
            className="text-center text-xs font-medium text-gray-500 underline-offset-2 hover:text-brand hover:underline"
          >
            Go to DigitalFlyer Growth
          </Link>
        )}

        {/* Jobs 5 and 6 first, since they're the two with a real, member-
            specific reason to act right now. The static website question
            (Job 4) and the general cross-sell come after. */}
        {showReviewWedge && <ReviewWedge reviewCount={reviewCount} />}
        {showQuoteNudge && <QuoteNudge sentCount={quoteStats.sentCount} wonCount={quoteStats.wonCount} />}
        {showWebsiteQuestion && <WebsiteQuestion />}

        {/* Cross-sell, and only to someone who does not already pay for
            Growth. Advertising it to an existing Growth member would be
            noise on their own dashboard. */}
        {!account.growthClientId && <GrowthFromBizUp />}
      </div>
      <SiteFooter />
    </main>
  );
}
