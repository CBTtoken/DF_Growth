import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Handoff 02 C: records a call tap, a WhatsApp tap or a form submission.
//
// The member page is `force-static` and cached at the edge, so this cannot be
// a server action on the page itself. A tiny route the button pings instead,
// deliberately fire-and-forget: it always answers 204, never blocks the tap,
// and never tells the caller whether the write landed. A visitor tapping
// "Call" must reach the phone whatever this route does.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS = new Set(["call", "whatsapp", "form"]);

// Handoff 02 C: "Do not retain visitor IP addresses or any other personal
// information beyond what the member's own form already collects."
//
// The host only, never the full referrer. A full referrer carries search terms
// and campaign identifiers, which is exactly the personal data POPIA makes us
// answer for. The host answers "Google, Facebook, or someone typing the
// address in" and stops there.
function sourceHost(referer: string | null): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).host || null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      growthClientId?: string;
      action?: string;
      device?: string;
    };

    const { growthClientId, action } = body;
    if (!growthClientId || !action || !ACTIONS.has(action)) {
      // Still 204. A malformed tracking ping is our problem, not the
      // visitor's, and an error status here would show up in their console on
      // a member's page.
      return new NextResponse(null, { status: 204 });
    }

    const device = body.device === "mobile" || body.device === "desktop" ? body.device : "unknown";

    const admin = createAdminClient();
    // The 10 second dedupe trigger on lead_events silently drops an immediate
    // repeat, so a double-tap needs no handling here.
    const { error } = await admin.from("lead_events").insert({
      growth_client_id: growthClientId,
      action,
      device,
      source: sourceHost(request.headers.get("referer")),
    });
    if (error) console.error("Failed to record lead event", action, error);
  } catch (err) {
    console.error("Failed to record lead event", err);
  }

  return new NextResponse(null, { status: 204 });
}
