import { handleReferralLinkVisit } from "@/lib/agents/referral-link";

// Sec 5: "Visiting growth.digitalflyersa.co.za/r/[code] sets an
// attribution cookie (30 days, per section 2) and redirects to /pricing."
// Kept working indefinitely alongside the newer agent.digitalflyersa.co.za
// subdomain (src/app/agent-link/[slug]/route.ts) — any code already
// generated or shared under this form must keep resolving, not just new
// ones. A code that isn't a real, approved agent still redirects cleanly
// to /pricing rather than 404ing — a mistyped or stale link shouldn't
// dead-end a prospect who's ready to sign up, it just doesn't earn anyone
// commission.
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return handleReferralLinkVisit(code);
}
