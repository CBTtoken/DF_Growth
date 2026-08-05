"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { FEATURE_KEYS } from "@/lib/meta/page-poster-features";

// Handoff Sec 5: "Dewald sees the queue in the dashboard and can approve,
// edit or kill any item." Approving and editing are one action here, not
// two screens: the textarea on the queue row is always editable, and
// submitting it both saves whatever is in the box and approves the post in
// the same click, since editing-then-approving is the actual common case,
// not a rare detour.
export async function approvePost(queueId: string, formData: FormData) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const message = String(formData.get("message") ?? "").trim();
  const linkUrl = String(formData.get("link_url") ?? "").trim();
  if (!message) return;

  const admin = createAdminClient();
  await admin
    .from("page_poster_queue")
    .update({
      message,
      link_url: linkUrl || null,
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: admin_.email,
    })
    .eq("id", queueId)
    .eq("status", "pending_approval");

  revalidatePath("/admin/page-poster");
}

// "Kill" — a rejected item is never published and never regenerated
// automatically for the same client/post (page-poster-queue.ts only skips
// re-queueing a Board offer that has zero existing rows, so a rejected
// offer stays rejected). Spotlight/new_member rotation state is untouched
// by a rejection, so that member simply waits its normal turn again.
export async function rejectPost(queueId: string) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const admin = createAdminClient();
  await admin
    .from("page_poster_queue")
    .update({ status: "rejected" })
    .eq("id", queueId)
    .in("status", ["pending_approval", "approved"]);

  revalidatePath("/admin/page-poster");
}

function isFeatureKey(value: string): boolean {
  return FEATURE_KEYS.some((f) => f.key === value);
}

// One-at-a-time add, kept for a single quick post. See batchAddFeaturePosts
// below for the "draft a fortnight in one sitting" path Dewald asked for.
export async function addFeaturePost(formData: FormData) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const body = String(formData.get("body") ?? "").trim();
  const linkUrl = String(formData.get("link_url") ?? "").trim();
  const featureKey = String(formData.get("feature_key") ?? "").trim();
  if (!body) return;

  const admin = createAdminClient();
  await admin.from("page_poster_evergreen").insert({
    body,
    link_url: linkUrl || null,
    feature_key: isFeatureKey(featureKey) ? featureKey : null,
  });

  revalidatePath("/admin/page-poster");
}

// Dewald, 5 August 2026: "schedule a week or two's posts and just let it
// run" — one line per post, `feature | text | link (optional)`, pasted in
// one box and parsed here. The generator (page-poster-queue.ts) picks
// these up automatically, fair-rotated, oldest-unused first, into the
// 08:15/13:30 slots. Blank lines and lines starting with # (for a comment
// or a section heading while drafting) are skipped rather than rejected,
// so a rough draft doesn't need to be perfectly clean to paste in.
export async function batchAddFeaturePosts(formData: FormData) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const raw = String(formData.get("batch") ?? "");
  const rows: { body: string; link_url: string | null; feature_key: string | null }[] = [];

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const parts = trimmed.split("|").map((p) => p.trim());
    const [featureKey, body, linkUrl] = parts;
    if (!body) continue; // A line with only a feature key and no text is not a post.

    rows.push({
      body,
      link_url: linkUrl || null,
      feature_key: isFeatureKey(featureKey) ? featureKey : null,
    });
  }

  if (rows.length === 0) return;

  const admin = createAdminClient();
  await admin.from("page_poster_evergreen").insert(rows);

  revalidatePath("/admin/page-poster");
}

// One reusable image per feature (Settings → Basic-style single upload,
// not per-post) — see the migration's own reasoning: every post about
// "Bookings" reuses whatever's uploaded here, so a batch of ten posts
// about the same feature never needs ten images.
export async function uploadFeatureImage(formData: FormData) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const featureKey = String(formData.get("feature_key") ?? "");
  const file = formData.get("photo");
  if (!isFeatureKey(featureKey) || !(file instanceof File) || file.size === 0) return;

  const admin = createAdminClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `page-poster-features/${featureKey}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from("client-photos")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (uploadError) {
    console.error("Feature image upload failed", uploadError);
    return;
  }

  const photoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-photos/${path}`;
  await admin
    .from("page_poster_feature_images")
    .upsert({ feature_key: featureKey, photo_url: photoUrl, updated_at: new Date().toISOString() }, { onConflict: "feature_key" });

  revalidatePath("/admin/page-poster");
}
