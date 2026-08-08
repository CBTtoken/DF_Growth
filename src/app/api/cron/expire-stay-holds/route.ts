import { NextResponse } from "next/server";
import { expireStaleHolds } from "@/lib/stays/expire-holds";

// Stays and Tours, handoff Job 3, and acceptance criterion 5: "An abandoned
// checkout releases its hold within 5 minutes without any page being
// loaded."
//
// This is the only job in this codebase with its own Vercel Cron entry
// rather than a slot inside /api/cron/daily. It has to be: the daily run
// happens once at 6am, and a room held at 11pm being freed at 6am the next
// morning is exactly the failure the handoff singled out. It runs every
// minute (see vercel.json), which is the cheapest thing in the estate --
// two indexed updates that usually touch nothing at all -- and the only
// schedule that actually keeps the promise made to the guesthouse.
//
// Reads the Authorization header, so it must never be statically cached.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await expireStaleHolds();
  return NextResponse.json({ ran: true, ...result });
}
