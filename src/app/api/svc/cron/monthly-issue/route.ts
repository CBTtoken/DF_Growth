import { NextResponse } from "next/server";
import { runMonthlyIssue } from "@/lib/svc/ledger";
import { freezeDueDraws } from "@/lib/svc/draw";

// SVC's benefit issue run, same CRON_SECRET-gated pattern as every other
// job. Runs from the consolidated daily cron rather than its own vercel
// cron entry (plan cron-count limit); idempotency does the scheduling
// work. On the 1st it issues the new month to everyone active; on every
// other day it back-fills members who activated since the last run, which
// is what makes "your first benefits arrive immediately" true without a
// second code path.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runMonthlyIssue();

  // Draws whose published cutoff has passed freeze here, so the cutoff is
  // real whether or not anyone presses the admin button.
  const drawsFrozen = await freezeDueDraws();

  if (result.error) {
    return NextResponse.json({ ...result, drawsFrozen }, { status: 500 });
  }
  return NextResponse.json({ ...result, drawsFrozen });
}
