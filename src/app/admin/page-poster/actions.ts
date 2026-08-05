"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";

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

// Handoff "Needs Dewald": the evergreen content file's final wording is his
// call, not generated. This just gives him a plain box to add one instead
// of needing SQL — the generator (page-poster-queue.ts) picks these up
// automatically next time it fills a gap the real candidates don't cover.
export async function addEvergreenPost(formData: FormData) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const body = String(formData.get("body") ?? "").trim();
  const slot = String(formData.get("slot") ?? "");
  const linkUrl = String(formData.get("link_url") ?? "").trim();
  if (!body || (slot !== "morning" && slot !== "evening")) return;

  const admin = createAdminClient();
  await admin.from("page_poster_evergreen").insert({ body, slot, link_url: linkUrl || null });

  revalidatePath("/admin/page-poster");
}

export async function updatePostingFrequency(formData: FormData) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const postsPerDay = Number(formData.get("posts_per_day"));
  const postsPerWeek = Number(formData.get("posts_per_week"));
  if (!Number.isFinite(postsPerDay) || !Number.isFinite(postsPerWeek)) return;

  const admin = createAdminClient();
  await admin
    .from("page_poster_settings")
    .update({
      posts_per_day: Math.max(0, Math.min(6, Math.round(postsPerDay))),
      posts_per_week: Math.max(0, Math.min(40, Math.round(postsPerWeek))),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  revalidatePath("/admin/page-poster");
}
