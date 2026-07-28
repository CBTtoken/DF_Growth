import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyQuoteExpiring, notifyInvoiceOverdue } from "@/lib/bizup/notifications";

// The two time-based KatisoBiz notifications. The third, "your customer
// opened it", fires from the document page itself and is not here.
//
// Runs from the daily cron. Both queries filter on the notified_* column
// being null and both mark it before moving on, so a retry, a double run
// or a redeploy mid-batch cannot email the same document twice.
//
// A member with notifications switched off is filtered inside the notify
// functions rather than here, so the guard column is still stamped and
// they do not receive a backlog if they later switch them back on. An
// invoice that went overdue while they had email off is history, not news.

// Quotes are chased two days before they lapse: long enough for the member
// to actually make the call, short enough to be urgent.
const EXPIRY_WARNING_DAYS = 2;

// Only quotes that are still live. A quote already accepted, declined,
// converted or superseded has an outcome and needs no chasing.
const OPEN_QUOTE_STATUSES = ["sent"];

// Only invoices with money still outstanding.
const UNPAID_INVOICE_STATUSES = ["issued", "partially_paid", "overdue"];

// A quiet cap so one enormous account cannot consume the whole cron budget
// and starve the jobs that run after this one. Anything not sent today is
// picked up tomorrow, because the guard column is still null.
const MAX_PER_RUN = 200;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const today = isoDate(now);
  const warnBy = isoDate(new Date(now.getTime() + EXPIRY_WARNING_DAYS * 86400000));

  let expiringSent = 0;
  let overdueSent = 0;

  // Quotes about to lapse. valid_until between today and the warning
  // horizon: a quote that lapsed while the job was not running is left
  // alone rather than chased late.
  const { data: expiring, error: expiringError } = await admin
    .from("bizup_documents")
    .select("id, account_id, number, total_incl_cents, valid_until, customer_snapshot")
    .eq("doc_type", "quote")
    .in("status", OPEN_QUOTE_STATUSES)
    .is("notified_expiring_at", null)
    .not("valid_until", "is", null)
    .gte("valid_until", today)
    .lte("valid_until", warnBy)
    .limit(MAX_PER_RUN);

  if (expiringError) console.error("KatisoBiz expiring-quote scan failed", expiringError);

  for (const doc of expiring ?? []) {
    // Stamped whether or not the send succeeds. A mail failure retried
    // daily against a bad address is exactly how a sending reputation is
    // lost, and the member can still see the quote in the app.
    await admin
      .from("bizup_documents")
      .update({ notified_expiring_at: new Date().toISOString() })
      .eq("id", doc.id)
      .is("notified_expiring_at", null);

    if (await notifyQuoteExpiring(doc)) expiringSent++;
  }

  // Invoices past their due date.
  const { data: overdue, error: overdueError } = await admin
    .from("bizup_documents")
    .select("id, account_id, number, total_incl_cents, due_date, customer_snapshot")
    .eq("doc_type", "invoice")
    .in("status", UNPAID_INVOICE_STATUSES)
    .is("notified_overdue_at", null)
    .not("due_date", "is", null)
    .lt("due_date", today)
    .limit(MAX_PER_RUN);

  if (overdueError) console.error("KatisoBiz overdue-invoice scan failed", overdueError);

  for (const doc of overdue ?? []) {
    await admin
      .from("bizup_documents")
      .update({ notified_overdue_at: new Date().toISOString() })
      .eq("id", doc.id)
      .is("notified_overdue_at", null);

    if (await notifyInvoiceOverdue(doc)) overdueSent++;
  }

  return NextResponse.json({
    ok: true,
    expiringFound: expiring?.length ?? 0,
    expiringSent,
    overdueFound: overdue?.length ?? 0,
    overdueSent,
  });
}
