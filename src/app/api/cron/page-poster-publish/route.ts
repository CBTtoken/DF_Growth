import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishTextPost, publishPhotoPost } from "@/lib/meta/page-poster";
import { notifySpotlightPublished } from "@/lib/meta/page-poster-notify";

// Runs every 15 minutes (see vercel.json) so jittered post times actually
// get hit close to when they were scheduled, rather than once a day.
// Handoff acceptance criteria 1 and 3: publishes unattended at a scheduled
// time, and nothing publishes without prior approval — this route only
// ever touches rows already sitting at status = 'approved'.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Cap per run: a healthy queue should never have this many due at once,
// this just bounds a pathological backlog from timing out the function.
const MAX_PER_RUN = 15;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Handoff Sec 5: "An item that is not approved by its scheduled time is
  // skipped, not delayed into a pile-up." Runs first, every pass, so an
  // approval that never came does not sit there forever looking pending.
  const { data: skipped } = await admin
    .from("page_poster_queue")
    .update({ status: "skipped" })
    .eq("status", "pending_approval")
    .lt("scheduled_for", now)
    .select("id");

  const { data: due } = await admin
    .from("page_poster_queue")
    .select("id, message, link_url, photo_url")
    .eq("status", "approved")
    .lte("scheduled_for", now)
    .order("scheduled_for", { ascending: true })
    .limit(MAX_PER_RUN);

  let published = 0;
  let failed = 0;

  for (const item of due ?? []) {
    const result = item.photo_url
      ? await publishPhotoPost(item.message, item.photo_url)
      : await publishTextPost(item.message, item.link_url);

    if (result.ok) {
      await admin
        .from("page_poster_queue")
        .update({ status: "published", published_at: new Date().toISOString(), meta_post_id: result.postId })
        .eq("id", item.id);
      published++;
      try {
        await notifySpotlightPublished(item.id);
      } catch (err) {
        // Handoff Sec 6 makes the member notification important, but a
        // failed email must never undo a successful publish or block the
        // next item in this loop.
        console.error("page poster member notification failed", item.id, err);
      }
    } else {
      // Prefixed so the admin screen can flag a dead token distinctly from
      // an ordinary publish failure (handoff acceptance criterion 6: token
      // expiry must be visible, never silent).
      const reason = result.tokenExpired ? `TOKEN_EXPIRED: ${result.error}` : result.error;
      await admin.from("page_poster_queue").update({ status: "failed", failure_reason: reason }).eq("id", item.id);
      failed++;
      console.error("page poster publish failed", item.id, reason);
    }
  }

  return NextResponse.json({ ok: true, skipped: skipped?.length ?? 0, published, failed, dueCount: due?.length ?? 0 });
}
