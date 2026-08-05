import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { pagePosterConfigured, checkPageToken } from "@/lib/meta/page-poster";
import { FEATURE_KEYS, featureLabel } from "@/lib/meta/page-poster-features";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { approvePost, rejectPost, addFeaturePost, batchAddFeaturePosts, uploadFeatureImage } from "@/app/admin/page-poster/actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type QueueRow = {
  id: string;
  post_type: "new_member" | "spotlight" | "board_highlight" | "feature_cta";
  message: string;
  link_url: string | null;
  photo_url: string | null;
  slot: "morning_feature" | "midday_feature" | "evening_member";
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
  feature_cta: "Feature CTA",
};

const SLOT_LABEL: Record<QueueRow["slot"], string> = {
  morning_feature: "08:15",
  midday_feature: "13:30",
  evening_member: "20:15",
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
  if (row.post_type === "feature_cta") return "DigitalFlyer";
  return row.growth_clients?.business_name ?? "Unknown member";
}

// Handoff Sec 5, the whole point of this screen: "Dewald sees the queue in
// the dashboard and can approve, edit or kill any item. Nothing publishes
// without approval on this first version." Every row's textarea is always
// editable and Approve saves + approves in one click (see actions.ts).
//
// Fixed schedule (Dewald, 5 August 2026): 08:15 and 13:30 are our own
// feature-CTA posts, 20:15 is the one member post a day. The old
// per-day/per-week frequency setting is gone, replaced by that fixed
// three-anchor shape — see lib/meta/page-poster-queue.ts.
export default async function AdminPagePosterPage() {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) forbidden();

  const admin = createAdminClient();

  const [
    { data: pending },
    tokenStatus,
    { data: failedRecent },
    { count: approvedCount },
    { data: featurePosts },
    { data: featureImages },
  ] = await Promise.all([
    admin
      .from("page_poster_queue")
      .select("id, post_type, message, link_url, photo_url, slot, scheduled_for, status, failure_reason, growth_clients(business_name), board_posts(title)")
      .eq("status", "pending_approval")
      .order("scheduled_for", { ascending: true })
      .limit(60),
    checkPageToken(),
    admin
      .from("page_poster_queue")
      .select("id, post_type, message, failure_reason, scheduled_for, growth_clients(business_name)")
      .eq("status", "failed")
      .order("scheduled_for", { ascending: false })
      .limit(10),
    admin.from("page_poster_queue").select("id", { count: "exact", head: true }).eq("status", "approved"),
    admin.from("page_poster_evergreen").select("id, body, feature_key, used_at").order("created_at", { ascending: false }).limit(30),
    admin.from("page_poster_feature_images").select("feature_key, photo_url"),
  ]);

  const rows = (pending ?? []) as unknown as QueueRow[];
  const imageByFeature = new Map((featureImages ?? []).map((f) => [f.feature_key, f.photo_url]));

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

        <Card className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-ink">Schedule</h2>
          <p className="text-xs text-gray-500">
            Fixed daily: <strong>08:15</strong> our own feature CTA, <strong>13:30</strong> a second one when there&apos;s
            content queued for it, <strong>20:15</strong> one member post (a new member first, then a fresh Board offer,
            then the next spotlight in rotation). {approvedCount ?? 0} approved and waiting to publish.
          </p>
        </Card>

        <Card className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-bold text-ink">Feature images</h2>
            <p className="text-xs text-gray-500">
              One image per feature, reused automatically by every post about it. Upload once, no need to attach an
              image each time you add a post below.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {FEATURE_KEYS.map((f) => (
              <form key={f.key} action={uploadFeatureImage} className="flex flex-col items-center gap-2">
                <input type="hidden" name="feature_key" value={f.key} />
                <div className="flex h-16 w-full items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                  {imageByFeature.get(f.key) ? (
                    // eslint-disable-next-line @next/next/no-img-element -- external Supabase storage URL, admin-only screen
                    <img src={imageByFeature.get(f.key)!} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-gray-400">No image</span>
                  )}
                </div>
                <p className="text-center text-[11px] font-medium text-gray-600">{f.label}</p>
                <input
                  type="file"
                  name="photo"
                  accept="image/*"
                  className="w-full text-[10px] file:mr-1 file:rounded-full file:border-0 file:bg-gray-100 file:px-2 file:py-1 file:text-[10px] file:font-semibold file:text-gray-600"
                />
                <button
                  type="submit"
                  className="w-full rounded-full border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-600 transition hover:border-gray-300"
                >
                  {imageByFeature.get(f.key) ? "Replace" : "Upload"}
                </button>
              </form>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-bold text-ink">Our own posts (feature CTAs)</h2>
            <p className="text-xs text-gray-500">
              Fill the 08:15 and 13:30 slots. Add one below, or paste a whole batch at once.
            </p>
          </div>

          <form action={addFeaturePost} className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <textarea
              name="body"
              placeholder="What should the post say?"
              rows={2}
              className="flex-1 rounded-xl border border-gray-200 p-3 text-sm text-gray-800"
            />
            <div className="flex flex-col gap-2 sm:w-48">
              <select name="feature_key" className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700">
                <option value="">No specific feature</option>
                {FEATURE_KEYS.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
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

          <details className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <summary className="cursor-pointer text-xs font-semibold text-gray-600">
              Add a batch instead (paste a fortnight&apos;s worth at once)
            </summary>
            <form action={batchAddFeaturePosts} className="mt-3 flex flex-col gap-2">
              <p className="text-[11px] text-gray-500">
                One line per post: <code className="rounded bg-white px-1 py-0.5">feature key | the post text | link (optional)</code>.
                Feature keys: {FEATURE_KEYS.map((f) => f.key).join(", ")}. Leave the feature key blank for a general
                post. Lines starting with # are ignored, so you can leave yourself notes while drafting.
              </p>
              <textarea
                name="batch"
                rows={6}
                placeholder={"growth_bookings | Take bookings straight from your page, no back-and-forth needed. | https://growth.digitalflyersa.co.za/how-it-works\nkatisobiz_slips | Snap a slip, done. Expenses recorded in seconds. |"}
                className="w-full rounded-xl border border-gray-200 p-3 font-mono text-xs text-gray-800"
              />
              <Button type="submit" variant="secondary" size="sm" className="self-start">
                Add batch
              </Button>
            </form>
          </details>

          {(featurePosts?.length ?? 0) > 0 && (
            <ul className="flex flex-col gap-2 text-xs text-gray-500">
              {featurePosts!.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2">
                  <span className="truncate">
                    <span className="font-semibold text-gray-700">{featureLabel(p.feature_key)}:</span> {p.body}
                  </span>
                  <StatusPill tone={p.used_at ? "neutral" : "info"}>{p.used_at ? "used" : "not yet used"}</StatusPill>
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
                    {POST_TYPE_LABEL[row.post_type]} · {SLOT_LABEL[row.slot]} · {formatSAST(row.scheduled_for)}
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
