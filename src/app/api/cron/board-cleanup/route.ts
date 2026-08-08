import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { bookingChatThreadIds } from "@/lib/stays/retention";

// The ten day clear-out, which Dewald asked for to keep the board and the
// servers clean.
//
// This one deletes on a schedule rather than queueing a decision, unlike the
// retention job, and the difference is deliberate. Retention removes a
// member's whole history and needs a person to press the button. This
// removes a want-ad that has done its job and a chat somebody has finished
// having, both of which were told up front that they last ten days.
//
// What it never touches: a business post. Each one is a permanent page that
// Google can rank, and that page is the entire reason this beats posting the
// same thing on Facebook.
const DAYS = 10;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();

  // Public posts, by the expiry stamped on them when they were written.
  const { data: expiredPosts } = await admin
    .from("board_posts")
    .delete()
    .eq("author_kind", "public")
    .not("expires_at", "is", null)
    .lt("expires_at", nowIso)
    .select("id");

  // Messages older than ten days. The thread survives if it has newer
  // messages in it, and a thread left with nothing goes with them, because
  // an empty conversation in a list is worse than no conversation.
  //
  // Except a conversation attached to a Stays and Tours booking, which is
  // on its own clock. Found 8 August 2026 while building that module: a
  // guest who books in June for December writes in June, and under this
  // ten day rule the arrival time and the dietary request would have been
  // deleted in July while the booking was still five months away. Those
  // threads are kept until ninety days after the guest leaves and are
  // deleted by src/lib/stays/retention.ts instead.
  const protectedThreads = await bookingChatThreadIds();
  let messageQuery = admin.from("board_messages").delete().lt("created_at", cutoff);
  if (protectedThreads.length > 0) {
    messageQuery = messageQuery.not("thread_id", "in", `(${protectedThreads.join(",")})`);
  }
  const { data: oldMessages } = await messageQuery.select("thread_id");

  let emptiedThreads = 0;
  const touched = [...new Set((oldMessages ?? []).map((m) => m.thread_id))];

  if (touched.length) {
    const { data: survivors } = await admin.from("board_messages").select("thread_id").in("thread_id", touched);
    const stillHasMessages = new Set((survivors ?? []).map((m) => m.thread_id));
    const empty = touched.filter((id) => !stillHasMessages.has(id));

    if (empty.length) {
      await admin.from("board_threads").delete().in("id", empty);
      emptiedThreads = empty.length;
    }
  }

  // Job 7: "one-tap renew for the poster, with a reminder before it
  // lapses." A business post never gets hard-deleted (above), so this pass
  // is the only warning a member gets before one comes off browse. Looked
  // up fresh, deduped via expiry_reminder_sent_at so a member is never
  // emailed twice for the same expiry.
  const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data: lapsing } = await admin
    .from("board_posts")
    .select("id, slug, title, growth_clients!inner(business_name, contact_email)")
    .eq("author_kind", "member")
    .eq("status", "published")
    .is("expiry_reminder_sent_at", null)
    .not("expires_at", "is", null)
    .lte("expires_at", in3Days)
    .gt("expires_at", nowIso);

  let remindersSent = 0;
  for (const post of (lapsing ?? []) as unknown as {
    id: string;
    slug: string;
    title: string;
    growth_clients: { business_name: string; contact_email: string | null };
  }[]) {
    const email = post.growth_clients.contact_email;
    if (!email) continue;

    const result = await sendEmail({
      to: email,
      subject: "A post on The Board is about to come down",
      html: `
        <p>Good day ${post.growth_clients.business_name},</p>
        <p>Your post "${post.title}" comes off The Board in the next 3 days.</p>
        <p>Renew it from your dashboard to keep it visible, one tap, no need to post it again.</p>
      `,
    });

    if (result.ok) {
      await admin.from("board_posts").update({ expiry_reminder_sent_at: nowIso }).eq("id", post.id);
      remindersSent++;
    } else {
      console.error("Board expiry reminder email failed", post.id, result.error);
    }
  }

  const summary = {
    expiredPosts: expiredPosts?.length ?? 0,
    deletedMessages: oldMessages?.length ?? 0,
    emptiedThreads,
    remindersSent,
  };

  // Same evidence table the retention job writes to, so there is one place
  // that answers "what has this system deleted, and when".
  await admin.from("retention_runs").insert({ mode: "delete", actor: "cron:board-cleanup", summary });

  return NextResponse.json({ ran: true, ...summary });
}
