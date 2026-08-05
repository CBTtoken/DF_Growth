import { NextResponse } from "next/server";
import { generatePagePosterQueue } from "@/lib/meta/page-poster-queue";

// Runs once a day (via the shared daily cron, see cron/daily/route.ts) to
// keep the page poster queue topped up a week ahead. Never publishes
// anything itself, only ever writes pending_approval rows.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await generatePagePosterQueue(7);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("page-poster-generate cron threw", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
