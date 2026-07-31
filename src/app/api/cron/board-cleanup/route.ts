import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const { data: oldMessages } = await admin
    .from("board_messages")
    .delete()
    .lt("created_at", cutoff)
    .select("thread_id");

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

  const summary = {
    expiredPosts: expiredPosts?.length ?? 0,
    deletedMessages: oldMessages?.length ?? 0,
    emptiedThreads,
  };

  // Same evidence table the retention job writes to, so there is one place
  // that answers "what has this system deleted, and when".
  await admin.from("retention_runs").insert({ mode: "delete", actor: "cron:board-cleanup", summary });

  return NextResponse.json({ ran: true, ...summary });
}
