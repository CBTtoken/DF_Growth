// Sec 2a: 30-day attribution window, the spec's own recommended default
// ("matching common practice"). Shared between the /r/[code] route that
// sets this cookie and pricing/actions.ts, which reads it at signup.
export const REFERRAL_COOKIE_NAME = "df_referral_code";
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// Single source of truth for the link an agent actually shares — the
// personalized agent.digitalflyersa.co.za/[slug] subdomain (real agent
// feedback follow-up), derived from NEXT_PUBLIC_SITE_URL by swapping its
// "growth" subdomain for "agent" rather than a separate env var, so this
// never drifts out of sync with whatever the main site's actual domain is.
// Falls back to the older /r/[code] path (still resolves indefinitely,
// see src/app/r/[code]/route.ts) if NEXT_PUBLIC_SITE_URL doesn't have the
// expected growth.* shape for any reason.
export function getAgentReferralLink(referralCode: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  try {
    const url = new URL(siteUrl);
    if (url.hostname.startsWith("growth.")) {
      const agentHostname = url.hostname.replace(/^growth\./, "agent.");
      return `${url.protocol}//${agentHostname}/${referralCode}`;
    }
  } catch {
    // Falls through to the /r/ path below.
  }
  return `${siteUrl}/r/${referralCode}`;
}
