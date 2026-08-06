"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { areaSlug } from "@/lib/board/areas";
import { categoryForIndustry } from "@/lib/board/categories";

// Refreshing everything a new or removed post changes. Called from both
// publish and take-down, because a post disappearing from an area page
// matters exactly as much as it appearing there, and a stale cached area
// page showing a withdrawn offer is the version a member complains about.
function revalidateBoardFor(options: { city: string | null; industry: string | null; postSlug?: string }) {
  revalidatePath("/board");
  revalidatePath("/dashboard/board");
  if (options.city) revalidatePath(`/board/area/${areaSlug(options.city)}`);
  const category = categoryForIndustry(options.industry);
  if (category) revalidatePath(`/board/category/${category.slug}`);
  if (options.postSlug) revalidatePath(`/board/post/${options.postSlug}`);
}

/**
 * The member taking his own post out of public view.
 *
 * Status change rather than a delete, and the photo stays in storage. When
 * Phase 2 adds reports and takedowns, "who removed this and when" has to be
 * answerable, and a deleted row cannot answer it.
 */
export async function hideBoardPost(postId: string) {
  const client = await requireGrowthClientId();
  if (client.error) return;

  const admin = createAdminClient();
  const { data: post } = await admin
    .from("board_posts")
    .update({ status: "hidden", updated_at: new Date().toISOString() })
    .eq("id", postId)
    // Scoped to the caller's own client, so a member can never take down
    // another business's post.
    .eq("growth_client_id", client.id)
    .select("slug")
    .maybeSingle();

  const { data: growthClient } = await admin
    .from("growth_clients")
    .select("city, industry")
    .eq("id", client.id)
    .single();

  revalidateBoardFor({
    city: growthClient?.city ?? null,
    industry: growthClient?.industry ?? null,
    postSlug: post?.slug,
  });
}

// Job 7: one-tap renew, deliberately not a re-submission. Re-running job
// 1's required-field checks here would turn "one tap" into a form, and an
// existing post that predates those checks (no photo, no condition) would
// otherwise become impossible to renew at all. A flat 60 days regardless of
// kind, rather than asking an offer/special poster for a fresh end date --
// the alternative defeats the "one tap" the brief asks for.
const RENEW_DAYS = 60;

/** The member keeping a post visible past its expiry, in one tap. */
export async function renewBoardPost(postId: string) {
  const client = await requireGrowthClientId();
  if (client.error) return;

  const admin = createAdminClient();
  const newExpiry = new Date(Date.now() + RENEW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: post } = await admin
    .from("board_posts")
    .update({
      expires_at: newExpiry,
      last_renewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId)
    .eq("growth_client_id", client.id)
    .select("slug")
    .maybeSingle();

  if (post?.slug) revalidatePath(`/board/post/${post.slug}`);
  revalidatePath("/board");
  revalidatePath("/dashboard/board");
}

/** Putting a hidden post back up. Same scoping. */
export async function republishBoardPost(postId: string) {
  const client = await requireGrowthClientId();
  if (client.error) return;

  const admin = createAdminClient();
  const { data: post } = await admin
    .from("board_posts")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("growth_client_id", client.id)
    // A post removed by platform moderation is not the member's to restore.
    // Phase 2 owns that path; this only ever reverses the member's own
    // take-down.
    .eq("status", "hidden")
    .select("slug")
    .maybeSingle();

  const { data: growthClient } = await admin
    .from("growth_clients")
    .select("city, industry")
    .eq("id", client.id)
    .single();

  revalidateBoardFor({
    city: growthClient?.city ?? null,
    industry: growthClient?.industry ?? null,
    postSlug: post?.slug,
  });
}
