import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// List Your Event Sprint 2, Sec 6: "automatic archiving of past events
// from the public browse view." The browse page (/events) already filters
// past events out of what it shows via a query condition — this cron
// doesn't change what's visible to anyone, it just formally transitions
// status to 'expired' for admin/data tidiness, same CRON_SECRET-gated
// pattern as onboarding-nudge and trial-reminders. Only ever touches
// events that were actually published; a pending_review or already
// removed/expired event is left alone.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: expired, error } = await admin
    .from("events")
    .update({ status: "expired" })
    .eq("status", "published")
    .or(`end_datetime.lt.${nowIso},and(end_datetime.is.null,start_datetime.lt.${nowIso})`)
    .select("id");

  if (error) {
    console.error("Failed to expire events", error);
    return NextResponse.json({ error: "Failed to expire events" }, { status: 500 });
  }

  return NextResponse.json({ expiredCount: expired?.length ?? 0 });
}
