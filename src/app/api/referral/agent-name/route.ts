import { NextResponse } from "next/server";
import { getReferredAgentDisplayName } from "@/lib/agents/attribution";

// Hybrid fallback field (real agent feedback follow-up): /pricing is
// statically rendered (export const revalidate = 60) so it can't read the
// referral cookie server-side without forcing the whole page dynamic —
// same tradeoff MarketingHeaderAuthLink already made for its own
// client-side auth check. TierCard reads the (now non-httpOnly) cookie
// itself and calls this endpoint to resolve it to a real agent's name.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.trim();

  const name = await getReferredAgentDisplayName(code || undefined);
  return NextResponse.json({ name });
}
