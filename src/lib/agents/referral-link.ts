import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { REFERRAL_COOKIE_NAME, REFERRAL_COOKIE_MAX_AGE_SECONDS } from "@/lib/agents/referral-cookie";

// Shared by both referral link entry points — the original /r/[code] path
// (kept working indefinitely for any code already generated or shared
// under that form) and the personalized agent.digitalflyersa.co.za/[slug]
// subdomain (Sec 5 follow-up: real agent feedback that a random code read
// as cold and impersonal). Both resolve against the same referral_code
// column — a personalized slug and a legacy random code are just two
// different string shapes stored in the same place, so this one handler
// covers both without caring which kind it was given.
export async function handleReferralLinkVisit(code: string): Promise<NextResponse> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  const admin = createAdminClient();
  const { data: agent } = await admin
    .from("agents")
    .select("id")
    .eq("referral_code", code)
    .eq("status", "approved")
    .maybeSingle();

  const response = NextResponse.redirect(`${siteUrl}/pricing`);

  if (agent) {
    response.cookies.set(REFERRAL_COOKIE_NAME, code, {
      maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
      // Not httpOnly (changed from the original Sprint 1 version): the
      // hybrid confirmation banner on /pricing (Sec 5 follow-up) needs to
      // read this client-side without breaking that page's static
      // rendering (export const revalidate = 60) by reaching for
      // cookies() in a Server Component — same reasoning as
      // MarketingHeaderAuthLink's own client-side auth check. The value
      // is just a referral code, not sensitive, so the tradeoff is safe.
      secure: true,
      sameSite: "lax",
      path: "/",
    });
  }

  return response;
}
