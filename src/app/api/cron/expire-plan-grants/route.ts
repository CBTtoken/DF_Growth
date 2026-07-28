import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Reverts a granted KatisoBiz plan once its end date has passed.
//
// This is what makes granting a plan safe to do. A plan set by hand with
// no expiry is a plan nobody remembers to take away, and a comp that
// quietly becomes permanent is revenue lost without anyone deciding to
// lose it.
//
// Runs from the daily cron. Deliberately touches only accounts whose
// plan_source is 'granted': a member who has since started paying for
// themselves must never be dropped back to free by this job.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: expired } = await admin
    .from("bizup_accounts")
    .select("id, business_name, plan, plan_granted_until")
    .eq("plan_source", "granted")
    .not("plan_granted_until", "is", null)
    .lt("plan_granted_until", today);

  const rows = expired ?? [];

  for (const row of rows) {
    await admin
      .from("bizup_accounts")
      .update({
        plan: "free",
        plan_source: "self_paid",
        plan_granted_until: null,
        plan_granted_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      // Re-checked in the update as well as the select, so an account that
      // started a real subscription between the two is not reverted.
      .eq("plan_source", "granted");

    await admin.from("bizup_audit_log").insert({
      account_id: row.id,
      action: "plan_grant_expired",
      from_status: row.plan,
      to_status: "free",
      reason: `Granted plan ended ${row.plan_granted_until}`,
    });
  }

  return NextResponse.json({ ran: true, reverted: rows.length });
}
