import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendStartedCheckin,
  sendIdleCheckin,
  sendFeedbackCheckin,
} from "@/lib/bizup/checkin-emails";

// Decides which of the three check-in emails a member should get, if any.
//
// Runs from the daily cron, which means the hour thresholds below are a
// floor rather than an appointment: a member who signed up at 09:00 crosses
// 24 hours at 09:00 the next day but is emailed at the following run. In
// practice that is between 24 and 48 hours, which is fine for a check-in
// and is worth knowing before anybody wonders why it did not arrive on the
// hour.
//
// The groups are mutually exclusive and checked in order of how much the
// member has done, so nobody receives two in one run.

const STARTED_AFTER_HOURS = 24;
const IDLE_AFTER_HOURS = 48;
const FEEDBACK_AFTER_HOURS = 72;

// One enormous account cannot starve the jobs that run after this one.
// Anything skipped is picked up tomorrow, because the guard column is still
// null.
const MAX_PER_RUN = 100;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();

  // Only members who want email. Dewald's position, and it is the right
  // one: somebody who switched notifications off gets contacted by him
  // personally if at all, never by the system.
  const { data: accounts, error } = await admin
    .from("bizup_accounts")
    .select("id, business_name, email, created_at, checkin_started_at, checkin_idle_at, checkin_feedback_at")
    .eq("notify_by_email", true)
    .not("email", "is", null)
    .lte("created_at", hoursAgo(STARTED_AFTER_HOURS))
    .limit(MAX_PER_RUN);

  if (error) {
    console.error("KatisoBiz check-in scan failed", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let started = 0;
  let idle = 0;
  let feedback = 0;

  for (const a of accounts ?? []) {
    const ageHours = (now - new Date(a.created_at).getTime()) / 3600_000;

    // What has this member actually done? Two counts rather than fetching
    // rows, because the answer is a number and nothing here needs the
    // documents themselves except the started branch.
    const [{ count: docCount }, { count: issuedCount }] = await Promise.all([
      admin.from("bizup_documents").select("id", { count: "exact", head: true }).eq("account_id", a.id),
      admin
        .from("bizup_documents")
        .select("id", { count: "exact", head: true })
        .eq("account_id", a.id)
        .not("number", "is", null),
    ]);

    const account = { id: a.id, businessName: a.business_name ?? "there", email: a.email as string };

    // Issued something: it worked, so ask what would make it better.
    if ((issuedCount ?? 0) > 0) {
      if (a.checkin_feedback_at || ageHours < FEEDBACK_AFTER_HOURS) continue;
      // Stamped before sending, so a failure cannot retry daily against an
      // address that is not working.
      await admin
        .from("bizup_accounts")
        .update({ checkin_feedback_at: new Date().toISOString() })
        .eq("id", a.id)
        .is("checkin_feedback_at", null);
      if (await sendFeedbackCheckin(account)) feedback++;
      continue;
    }

    // Built a draft and stopped. The most valuable group, and the one with
    // a real question to answer.
    if ((docCount ?? 0) > 0) {
      if (a.checkin_started_at) continue;

      const { data: draft } = await admin
        .from("bizup_documents")
        .select("total_incl_cents, bizup_customers(name)")
        .eq("account_id", a.id)
        .is("number", null)
        // The biggest one, because that is the one they care about.
        .order("total_incl_cents", { ascending: false })
        .limit(1)
        .maybeSingle();

      await admin
        .from("bizup_accounts")
        .update({ checkin_started_at: new Date().toISOString() })
        .eq("id", a.id)
        .is("checkin_started_at", null);

      const customer = draft?.bizup_customers as unknown as { name: string } | null;
      if (
        await sendStartedCheckin(account, {
          totalCents: draft?.total_incl_cents ?? 0,
          customerName: customer?.name ?? null,
        })
      ) {
        started++;
      }
      continue;
    }

    // Nothing at all. Offered help rather than told to try harder.
    if (a.checkin_idle_at || ageHours < IDLE_AFTER_HOURS) continue;
    await admin
      .from("bizup_accounts")
      .update({ checkin_idle_at: new Date().toISOString() })
      .eq("id", a.id)
      .is("checkin_idle_at", null);
    if (await sendIdleCheckin(account)) idle++;
  }

  return NextResponse.json({
    ok: true,
    scanned: accounts?.length ?? 0,
    started,
    idle,
    feedback,
  });
}
