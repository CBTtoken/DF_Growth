import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { logJobsModeration } from "@/lib/jobs/moderation";
import { LAPSE_GRACE_DAYS } from "@/lib/jobs/entitlements";
import { JOBS_ORIGIN } from "@/lib/jobs/host";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// KatisoBiz Jobs' daily housekeeping, three passes, structured like
// board-cleanup and registered in the same single daily cron:
//
//   1. Expiry reminders. A vacancy expiring within three days gets one
//      email with a renew nudge. Stamped only when the send succeeded, so
//      a Resend failure retries tomorrow (board-cleanup's own rule).
//   2. Purge. Spec: "Listings run 30 days, one-tap renew, then automatic
//      purge", with a stripped demand line surviving (role, area, dates,
//      outcome, nothing identifying) -- the WhatsApp-inbox split.
//   3. Lapse enforcement. Dewald: a lapsed subscription keeps its posts
//      for two weeks, then they come down and the plan reverts to free.

const REMINDER_DAYS = 3;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();
  let remindersSent = 0;
  let purged = 0;
  let lapsedEnforced = 0;

  // ---- 1. Expiry reminders ----
  const reminderCutoff = new Date(now.getTime() + REMINDER_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: expiring } = await admin
    .from("jobs_vacancies")
    .select("id, title, expires_at, jobs_employers!inner(business_name, email)")
    .eq("status", "published")
    .gt("expires_at", nowIso)
    .lte("expires_at", reminderCutoff)
    .is("expiry_reminder_sent_at", null);

  for (const v of expiring ?? []) {
    const employer = v.jobs_employers as unknown as { business_name: string; email: string } | null;
    if (!employer?.email) continue;

    const result = await sendEmail({
      to: employer.email,
      subject: `Your job post "${v.title}" expires soon`,
      html:
        `<p>Good day ${employer.business_name},</p>` +
        `<p>Your post <strong>${v.title}</strong> comes down on ` +
        `${new Date(v.expires_at).toLocaleDateString("en-ZA", { day: "numeric", month: "long" })}. ` +
        `If the position is still open, renewing takes one tap.</p>` +
        `<p><a href="${JOBS_ORIGIN}/employer">Renew it here</a></p>` +
        `<p>If the position is filled, you can leave it to come down on its own, or take it down early ` +
        `from the same page.</p>`,
      fromName: "KatisoBiz Jobs",
      replyTo: "info@digitalflyer.co.za",
    });

    // Only stamped on a real send, so a failure retries tomorrow.
    if (result.ok) {
      await admin.from("jobs_vacancies").update({ expiry_reminder_sent_at: nowIso }).eq("id", v.id);
      remindersSent++;
    }
  }

  // ---- 2. Purge expired and taken-down posts ----
  const { data: dead } = await admin
    .from("jobs_vacancies")
    .select("id, suburb, province, created_at, status, expires_at, jobs_ofo_occupations(title)")
    .or(`and(status.eq.published,expires_at.lt.${nowIso}),status.eq.removed,status.eq.expired`);

  for (const v of dead ?? []) {
    const roleLabel = (v.jobs_ofo_occupations as unknown as { title: string } | null)?.title ?? null;
    await admin.from("jobs_vacancy_outcomes").insert({
      role_label: roleLabel,
      area: [v.suburb, v.province].filter(Boolean).join(", "),
      posted_at: v.created_at,
      outcome: v.status === "removed" ? "taken_down" : "expired",
    });
    await admin.from("jobs_vacancies").delete().eq("id", v.id);
    purged++;
  }

  if (purged > 0) {
    // The evidence row, same as board-cleanup: retention that ran is
    // retention that can be shown to have run.
    await admin.from("retention_runs").insert({
      mode: "delete",
      actor: "cron:jobs-cleanup",
      summary: { vacancies_purged: purged },
    });
  }

  // ---- 3. Lapse enforcement, day 14 ----
  const graceCutoff = new Date(now.getTime() - LAPSE_GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: lapsedEmployers } = await admin
    .from("jobs_employers")
    .select("id, business_name")
    .lt("plan_lapsed_at", graceCutoff)
    .in("plan", ["starter", "unlimited"]);

  for (const employer of lapsedEmployers ?? []) {
    const { data: liveVacancies } = await admin
      .from("jobs_vacancies")
      .select("id, suburb, province, created_at, jobs_ofo_occupations(title)")
      .eq("employer_id", employer.id)
      .eq("status", "published");

    for (const v of liveVacancies ?? []) {
      const roleLabel = (v.jobs_ofo_occupations as unknown as { title: string } | null)?.title ?? null;
      await admin.from("jobs_vacancy_outcomes").insert({
        role_label: roleLabel,
        area: [v.suburb, v.province].filter(Boolean).join(", "),
        posted_at: v.created_at,
        outcome: "lapse_removed",
      });
      await admin.from("jobs_vacancies").delete().eq("id", v.id);
      await logJobsModeration({
        targetType: "vacancy",
        targetId: v.id,
        action: "lapse_removed",
        rule: "subscription_lapse_14d",
        actor: { kind: "system" },
        note: `Employer ${employer.business_name}'s subscription ended over ${LAPSE_GRACE_DAYS} days ago`,
      });
    }

    // Reverted, never deleted: the account and its history stay, only the
    // entitlement drops (lib/bizup/entitlements.ts's lapse rule).
    await admin
      .from("jobs_employers")
      .update({ plan: "free", plan_lapsed_at: null, updated_at: nowIso })
      .eq("id", employer.id)
      // Re-checked in the UPDATE itself so an employer who re-subscribed
      // mid-run is not dropped (expire-plan-grants' own predicate trick).
      .lt("plan_lapsed_at", graceCutoff);
    lapsedEnforced++;
  }

  return NextResponse.json({ remindersSent, purged, lapsedEnforced });
}
