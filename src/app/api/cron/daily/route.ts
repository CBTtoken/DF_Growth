import { NextResponse } from "next/server";
import { GET as expireEvents } from "../expire-events/route";
import { GET as onboardingNudge } from "../onboarding-nudge/route";
import { GET as trialReminders } from "../trial-reminders/route";

// All three jobs now share one invocation instead of the three separate
// function budgets they had as individual endpoints, and two of them loop
// over clients sending emails via Resend — give the combined run generous
// headroom so it can't hit the default (short) function timeout mid-send.
export const maxDuration = 60;
// Reads the Authorization header, so it must never be statically cached.
export const dynamic = "force-dynamic";

// Single daily entry point for all three scheduled jobs, invoked by Vercel
// Cron (see vercel.json). Replaces three separate GitHub Actions workflows
// that called the individual endpoints over the public internet — those
// intermittently failed at the TLS-handshake layer (curl exit 35) because
// Vercel's platform-level bot mitigation occasionally reset connections
// from GitHub's shared runner IP pool, emailing Dewald a false-alarm
// failure on ~1 run in 4. Vercel Cron triggers this from inside Vercel's
// own network, so that failing hop no longer exists.
//
// Vercel automatically attaches `Authorization: Bearer $CRON_SECRET` to
// cron requests when a CRON_SECRET env var is set (it is, in Production),
// and each job handler below already validates exactly that header — so
// this just re-presents the same authorization to each one. Consolidated
// into a single cron entry (rather than three) to stay within every
// Vercel plan's cron-count limit and to keep it one run, one log.
//
// Each job is run independently in its own try/catch: all three are
// idempotent (per-client sent-at tracking, or pure data tidiness), so one
// failing must never skip the other two, and a transient failure just
// self-heals on the next day's run.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobs = [
    ["expireEvents", expireEvents],
    ["onboardingNudge", onboardingNudge],
    ["trialReminders", trialReminders],
  ] as const;

  const results: Record<string, unknown> = {};
  for (const [name, handler] of jobs) {
    try {
      // A fresh Request per job carrying the same authorization the job's
      // own header check expects. The URL is only used for construction;
      // none of the handlers read query params.
      const res = await handler(new Request(new URL(request.url), { headers: { authorization: auth } }));
      results[name] = { status: res.status, body: await res.json().catch(() => null) };
    } catch (err) {
      console.error(`Daily cron job ${name} threw`, err);
      results[name] = { status: 500, error: String(err) };
    }
  }

  return NextResponse.json({ ran: true, results });
}
