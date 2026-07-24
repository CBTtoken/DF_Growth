import { NextResponse } from "next/server";
import { getTopVisitedClients } from "@/lib/growth-client/top-visited";
import { captureAndStoreScreenshot } from "@/lib/screenshot/capture-and-store";

// A real HTTP round trip per client (not Satori/next-og rendering like the
// other /api/og/* routes), so this needs the Node runtime and real
// headroom, matching the pattern src/app/api/cron/daily/route.ts already
// established for its own slower, per-client-loop jobs.
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Only the top N most-visited active clients get a screenshot, not every
// client — Dewald's explicit direction, and it keeps this comfortably
// inside the managed screenshot API's free 100/month tier at the weekly
// cadence this is invoked at (see daily/route.ts's day-of-week gate).
const SCREENSHOT_TOP_N = 20;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const topClients = await getTopVisitedClients(SCREENSHOT_TOP_N);

  let succeeded = 0;
  let failed = 0;
  // Per-client try/catch (mirrors scripts/send-reactivation-batch.js's
  // error-isolation pattern) — one client's capture failing (e.g. their
  // page happens to be down) must never skip the rest of the batch.
  for (const client of topClients) {
    try {
      const result = await captureAndStoreScreenshot(client.id, client.slug);
      if (result.ok) {
        succeeded++;
      } else {
        failed++;
        console.error("Screenshot refresh failed", client.slug, result.error);
      }
    } catch (err) {
      failed++;
      console.error("Screenshot refresh threw", client.slug, err);
    }
  }

  return NextResponse.json({ attempted: topClients.length, succeeded, failed });
}
