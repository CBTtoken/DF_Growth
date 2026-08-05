import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { pagePosterConfigured, checkPageToken } from "@/lib/meta/page-poster";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { approvePost, rejectPost, updatePostingFrequency, addEvergreenPost } from "@/app/admin/page-poster/actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type QueueRow = {
  id: string;
  post_type: "new_member" | "spotlight" | "board_highlight" | "evergreen";
  message: string;
  link_url: string | null;
  photo_url: string | null;
  slot: "morning" | "evening";
  scheduled_for: string;
  status: string;
  failure_reason: string | null;
  growth_clients: { business_name: string } | null;
  board_posts: { title: string } | null;
};

const POST_TYPE_LABEL: Record<QueueRow["post_type"], string> = {
  new_member: "New member",
  spotlight: "Spotlight",
  board_highlight: "Board offer",
  evergreen: "Evergreen",
};

function formatSAST(iso: string): string {
  return new Date(iso).toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function whoLabel(row: QueueRow): string {
  if (row.post_type === "board_highlight") {
    return row.board_posts?.title ? `${row.growth_clients?.business_name ?? "A member"}: ${row.board_posts.title}` : "Board offer";
  }
  if (row.post_type === "evergreen") return "DigitalFlyer";
  return row.growth_clients?.business_name ?? "Unknown member";
}

// Handoff Sec 5, the whole point of this screen: "Dewald sees the queue in
// the dashboard and can approve, edit or kill any item. Nothing publishes
// without approval on this first version." Every row's textarea is always
// editable and Approve saves + approves in one click (see actions.ts).
export default async function AdminPagePosterPage() {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) forbidden();

  const admin = createAdminClient();

  const [
    { data: pending },
    { data: settingsRow },
    tokenStatus,
    { data: failedRecent },
    { count: approvedCount },
    { data: evergreenPosts },
  ] = await Promise.all([
      admin
        .from("page_poster_queue")
        .select("id, post_type, message, link_url, photo_url, slot, scheduled_for, status, failure_reason, growth_clients(business_name), board_posts(title)")
        .eq("status", "pending_approval")
        .order("scheduled_for", { ascending: true })
        .limit(60),
      admin.from("page_poster_settings").select("posts_per_day, posts_per_week").eq("id", 1).single(),
      checkPageToken(),
      admin
        .from("page_poster_queue")
        .select("id, post_type, message, failure_reason, scheduled_for, growth_clients(business_name)")
        .eq("status", "failed")
        .order("scheduled_for", { ascending: false })
        .limit(10),
      admin.from("page_poster_queue").select("id", { count: "exact", head: true }).eq("status", "approved"),
      admin.from("page_poster_evergreen").select("id, slot, body, used_at").order("created_at", { ascending: false }).limit(20),
    ]);

  const rows = (pending ?? []) as unknown as QueueRow[];

  return (
    <main className="min-h-full bg-gray-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <BrandHeader />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm font-semibold text-gray-500 hover:text-gray-700">
              ← Admin
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-ink">Page poster</h1>
          </div>
          <StatusPill>{rows.length} waiting</StatusPill>
        </div>

        {/* Acceptance criterion 6: token expiry must be visible, never
            silent. Shown unconditionally at the top of the screen, not only
            when something has already failed because of it. */}
        {!pagePosterConfigured() ? (
          <Card variant="warning">
            <p className="text-sm font-semibold text-ink">Not connected yet</p>
            <p className="mt-1 text-sm text-gray-600">
              The queue still fills up below, but nothing can publish until the Facebook page connection is set up.
              See the numbered steps in the sprint report.
            </p>
          </Card>
        ) : tokenStatus.checked && !tokenStatus.valid ? (
          <Card variant="warning">
            <p className="text-sm font-semibold text-red-700">The Facebook connection needs reconnecting</p>
            <p className="mt-1 text-sm text-gray-600">{tokenStatus.error}</p>
          </Card>
        ) : (
          <Card className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Facebook page connection is working.</p>
            <StatusPill tone="success">Connected</StatusPill>
          </Card>
        )}

        {(failedRecent?.length ?? 0) > 0 && (
          <Card variant="warning" className="flex flex-col gap-3">
            <h2 className="text-sm font-bold text-red-700">Recent failures ({failedRecent!.length})</h2>
            <ul className="flex flex-col gap-2">
              {failedRecent!.map((f) => (
                <li key={f.id} className="rounded-xl bg-white p-3 text-xs text-gray-600">
                  <span className="font-semibold text-gray-900">
                    {(f.growth_clients as unknown as { business_name: string } | null)?.business_name ?? POST_TYPE_LABEL[f.post_type as QueueRow["post_type"]]}
                  </span>{" "}
                  · {formatSAST(f.scheduled_for)}
                  <p className="mt-1 text-red-600">{f.failure_reason}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-ink">Posting frequency</h2>
            <p className="text-xs text-gray-500">{approvedCount ?? 0} approved and waiting to publish.</p>
          </div>
          <form action={updatePostingFrequency} className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-gray-600">
              Per day
              <input
                type="number"
                name="posts_per_day"
                min={0}
                max={6}
                defaultValue={settingsRow?.posts_per_day ?? 2}
                className="w-14 rounded-lg border border-gray-200 px-2 py-1 text-sm"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-gray-600">
              Per week
              <input
                type="number"
                name="posts_per_week"
                min={0}
                max={40}
                defaultValue={settingsRow?.posts_per_week ?? 10}
                className="w-14 rounded-lg border border-gray-200 px-2 py-1 text-sm"
              />
            </label>
            <Button type="submit" variant="secondary" size="sm">
              Save
            </Button>
          </form>
        </Card>

        <Card className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-bold text-ink">Our own posts (evergreen)</h2>
            <p className="text-xs text-gray-500">
              Fills any gap a member spotlight or Board offer doesn&apos;t cover. Add as many as you like, they cycle
              through in order before repeating.
            </p>
          </div>
          <form action={addEvergreenPost} className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <textarea
              name="body"
              placeholder="What should the post say?"
              rows={2}
              className="flex-1 rounded-xl border border-gray-200 p-3 text-sm text-gray-800"
            />
            <div className="flex flex-col gap-2 sm:w-48">
              <select name="slot" className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700">
                <option value="morning">Morning (short)</option>
                <option value="evening">Evening (longer)</option>
              </select>
              <input
                type="text"
                name="link_url"
                placeholder="Link (optional)"
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600"
              />
              <Button type="submit" size="sm">
                Add
              </Button>
            </div>
          </form>
          {(evergreenPosts?.length ?? 0) > 0 && (
            <ul className="flex flex-col gap-2 text-xs text-gray-500">
              {evergreenPosts!.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2">
                  <span className="truncate">{e.body}</span>
                  <StatusPill tone={e.used_at ? "neutral" : "info"}>{e.used_at ? "used" : "not yet used"}</StatusPill>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <section className="flex flex-col gap-3">
          {rows.map((row) => (
            <Card key={row.id} variant="elevated" className="flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{whoLabel(row)}</p>
                  <p className="text-sm text-gray-500">
                    {POST_TYPE_LABEL[row.post_type]} · {row.slot} · {formatSAST(row.scheduled_for)}
                  </p>
                </div>
              </div>

              {row.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element -- external Supabase storage URL, not worth next/image config for an admin-only screen
                <img src={row.photo_url} alt="" className="h-40 w-full rounded-xl object-cover" />
              )}

              <form action={approvePost.bind(null, row.id)} className="flex flex-col gap-2">
                <textarea
                  name="message"
                  defaultValue={row.message}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800"
                />
                <input
                  type="text"
                  name="link_url"
                  defaultValue={row.link_url ?? ""}
                  placeholder="Link (optional)"
                  className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600"
                />
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" size="md">
                    Approve
                  </Button>
                </div>
              </form>
              <form action={rejectPost.bind(null, row.id)}>
                <Button type="submit" variant="destructive" size="md">
                  Reject
                </Button>
              </form>
            </Card>
          ))}
          {rows.length === 0 && (
            <Card>
              <p className="text-sm text-gray-400">Nothing waiting on approval right now.</p>
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}
