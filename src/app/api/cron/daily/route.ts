import { NextResponse } from "next/server";
import { GET as expireEvents } from "../expire-events/route";
import { GET as onboardingNudge } from "../onboarding-nudge/route";
import { GET as trialReminders } from "../trial-reminders/route";
import { GET as refreshScreenshots } from "../refresh-screenshots/route";
import { GET as expirePlanGrants } from "../expire-plan-grants/route";
import { GET as bizupNotifications } from "../bizup-notifications/route";
import { GET as bizupCheckins } from "../bizup-checkins/route";
import { GET as retentionReport } from "../retention/route";
import { GET as boardCleanup } from "../board-cleanup/route";
import { GET as pagePosterGenerate } from "../page-poster-generate/route";
import { runHealthChecks } from "@/lib/desk/health/run";

// Every scheduled job shares one invocation instead of the separate
// function budgets they had as individual endpoints, and several of them
// loop over members sending emails via Resend, so the combined run gets
// generous headroom rather than hitting the default function timeout
// partway through a send. Raised from 60 when the health checks joined
// this run: they fetch five public sites with a 15 second timeout each
// (in parallel, but a bad day is a slow day) plus two Vercel billing
// reads, and a timeout here would take the other jobs' results with it.
export const maxDuration = 120;
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

  const jobs: [string, (req: Request) => Promise<Response>][] = [
    ["expireEvents", expireEvents],
    ["onboardingNudge", onboardingNudge],
    ["trialReminders", trialReminders],
    ["expirePlanGrants", expirePlanGrants],
    ["bizupNotifications", bizupNotifications],
    ["bizupCheckins", bizupCheckins],
    // Reports what retention is due and writes the evidence row. Never
    // deletes: that is a button on /admin/retention.
    ["retentionReport", retentionReport],
    // The ten day clear-out. Deletes on a schedule rather than queueing a
    // decision, because a want-ad and a finished chat were both told up
    // front that they last ten days. Never touches a business post.
    ["boardCleanup", boardCleanup],
    // Tops the page poster queue up a week ahead. Never publishes, only
    // ever writes pending_approval rows for Dewald to act on.
    ["pagePosterGenerate", pagePosterGenerate],
  ];
  // Screenshot refresh only needs to run weekly — real pages don't change
  // often enough to justify a daily capture, and running it daily would
  // burn through the managed screenshot API's free 100/month tier for no
  // real benefit. Monday (UTC) chosen arbitrarily; any fixed day works.
  if (new Date().getUTCDay() === 1) {
    jobs.push(["refreshScreenshots", refreshScreenshots]);
  }

  const results: Record<string, unknown> = {};

  // The Desk health check's daily run (handoff section 4: a daily run that
  // turns failures into Desk items). Not a route handler like the others,
  // so it runs directly; runHealthChecks stores its own results and raises
  // its own items, and warn creates nothing, same as the button.
  try {
    const health = await runHealthChecks();
    results["healthChecks"] = {
      status: 200,
      body: {
        ran: health.length,
        fails: health.filter((r) => r.status === "fail").length,
        warns: health.filter((r) => r.status === "warn").length,
      },
    };
  } catch (err) {
    console.error("Daily cron job healthChecks threw", err);
    results["healthChecks"] = { status: 500, error: String(err) };
  }

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
