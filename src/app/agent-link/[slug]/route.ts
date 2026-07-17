import { handleReferralLinkVisit } from "@/lib/agents/referral-link";

// Reached via middleware.ts rewriting agent.digitalflyersa.co.za/[slug]
// requests here internally — the browser's address bar keeps showing the
// personalized subdomain URL, this route just does the actual lookup and
// cookie-setting, identical to the original /r/[code] path (both resolve
// against the same referral_code column).
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return handleReferralLinkVisit(slug);
}
