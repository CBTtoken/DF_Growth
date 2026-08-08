import { createAdminClient } from "@/lib/supabase/admin";

// What happens to a guest's conversation, and when.
//
// Handoff Job 7: "Guest details are personal information belonging to
// non-members. The same standing rules apply: never store what is not
// needed, personal information never appears in a page an unauthenticated
// request can fetch, and the retention policy for these conversations is
// written in this sprint, not afterwards."
//
// THE POLICY
//
// A guest conversation attached to a booking is kept until 90 days after
// the guest leaves, or 90 days after the trip runs, and is then deleted in
// full: every message, and the thread itself.
//
// Why 90 days and not ten. The Board's own clear-out deletes any message
// older than ten days, on the reasoning that a want-ad and a finished chat
// were both told up front that they last ten days. That reasoning does not
// carry over. A guest who books in June for December writes to the member
// in June, and under the ten day rule that conversation, with the arrival
// time and the dietary request and the "we are bringing a cot" in it, would
// be gone by July while the booking it belongs to is still five months
// away. Ninety days after departure covers the stay itself and the short
// period afterwards where a question actually still comes up: a lost
// phone charger, a disputed balance, a review that needs answering.
//
// Why it is deleted rather than kept. It is a non-member's name, email
// address and phone number sitting in a table nobody is asking to look at
// again. Never store what you do not need.
//
// This is the number that needs Dewald's approval, and it is the only thing
// about this policy that is a judgement call rather than a consequence.
// Changing it is changing the constant below.
export const CHAT_RETENTION_DAYS_AFTER_DEPARTURE = 90;

/**
 * Every chat thread that belongs to a booking, so the Board's ten day
 * clear-out can leave them alone.
 *
 * Bounded by how many bookings have ever had a conversation, which is a
 * small number per member and a modest one across the platform. Worth
 * moving into SQL as a `not exists` if that ever stops being true; flagged
 * rather than pre-optimised.
 */
export async function bookingChatThreadIds(): Promise<string[]> {
  const admin = createAdminClient();
  const [stays, tours] = await Promise.all([
    admin.from("stays_bookings").select("chat_thread_id").not("chat_thread_id", "is", null),
    admin.from("tours_bookings").select("chat_thread_id").not("chat_thread_id", "is", null),
  ]);

  const ids = new Set<string>();
  for (const row of stays.data ?? []) if (row.chat_thread_id) ids.add(row.chat_thread_id);
  for (const row of tours.data ?? []) if (row.chat_thread_id) ids.add(row.chat_thread_id);
  return [...ids];
}

export type RetentionResult = { threads: number; messages: number };

/**
 * Deletes the conversations whose ninety days are up.
 *
 * Runs inside the daily cron rather than on its own schedule: nothing here
 * is time-critical to the hour, and a retention job that deletes a person's
 * data should run once a day where its result is logged next to everything
 * else, not every minute where nobody looks.
 */
export async function purgeExpiredGuestChats(): Promise<RetentionResult> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - CHAT_RETENTION_DAYS_AFTER_DEPARTURE * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // A stay's clock starts when the guest checks out. A tour's starts on the
  // day it runs. Cancelled bookings are included: a conversation about a
  // stay that never happened is even less worth keeping.
  const [stays, tours] = await Promise.all([
    admin
      .from("stays_bookings")
      .select("id, chat_thread_id")
      .not("chat_thread_id", "is", null)
      .lt("check_out", cutoff),
    admin
      .from("tours_bookings")
      .select("id, chat_thread_id, tours!inner(departure_date)")
      .not("chat_thread_id", "is", null)
      .lt("tours.departure_date", cutoff),
  ]);

  const threadIds = [
    ...new Set([
      ...(stays.data ?? []).map((row) => row.chat_thread_id as string),
      ...(tours.data ?? []).map((row) => row.chat_thread_id as string),
    ]),
  ];

  if (threadIds.length === 0) return { threads: 0, messages: 0 };

  const { data: deletedMessages } = await admin
    .from("board_messages")
    .delete()
    .in("thread_id", threadIds)
    .select("id");

  // The booking keeps its own record. Only the conversation goes, and the
  // pointer to it is cleared so nothing is left holding a reference to a
  // thread that no longer exists.
  await Promise.all([
    admin.from("stays_bookings").update({ chat_thread_id: null }).in("chat_thread_id", threadIds),
    admin.from("tours_bookings").update({ chat_thread_id: null }).in("chat_thread_id", threadIds),
  ]);

  const { data: deletedThreads } = await admin
    .from("board_threads")
    .delete()
    .in("id", threadIds)
    .select("id");

  return { threads: deletedThreads?.length ?? 0, messages: deletedMessages?.length ?? 0 };
}
