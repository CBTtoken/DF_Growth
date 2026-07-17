import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { REFERRAL_COOKIE_NAME, REFERRAL_COOKIE_MAX_AGE_SECONDS } from "@/lib/agents/referral-cookie";

// Sec 5: "Visiting growth.digitalflyersa.co.za/r/[code] sets an
// attribution cookie (30 days, per section 2) and redirects to /pricing."
// A code that isn't a real, approved agent still redirects cleanly to
// /pricing rather than 404ing — a mistyped or stale link shouldn't dead-end
// a prospect who's ready to sign up, it just doesn't earn anyone commission.
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
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
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
  }

  return response;
}
