import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";

// Consolidated Sprint Sec 3.4: fired client-side (PageViewTracker.tsx), not
// from the page component itself — [clientSlug]/page.tsx is force-static
// with a 60s revalidate window, so the component only actually re-executes
// on an ISR regen, not on every real visitor. A client-side beacon after
// paint is the only way to count every real view without making the page
// dynamic again (that tradeoff was already made deliberately once this
// session for a real LCP regression — not undoing it just for tracking).
export async function POST(request: Request) {
  const ip = clientIpFromHeaders(await headers());
  // Generous limit — a real visitor's browser fires this once per page
  // load, this is only guarding against a scripted loop, not real traffic.
  if (isRateLimited(`pageview:${ip}`, 60, 60 * 1000)) {
    return NextResponse.json({ received: true });
  }

  const { slug } = (await request.json().catch(() => ({}))) as { slug?: string };
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();
  const { data: client } = await admin.from("growth_clients").select("id").eq("slug", slug).maybeSingle();
  if (client) {
    await admin.from("page_views").insert({ growth_client_id: client.id });
  }

  return NextResponse.json({ received: true });
}
