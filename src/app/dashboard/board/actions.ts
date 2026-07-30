"use server";

import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { boardPostSchema } from "@/lib/schemas/board";
import { buildPostSlug } from "@/lib/board/slug";
import { areaSlug } from "@/lib/board/areas";
import { categoryForIndustry } from "@/lib/board/categories";
import { parseAmountToCents } from "@/lib/bizup/money";
import { isRateLimited } from "@/lib/rate-limit";
import { OTHER_CITY } from "@/lib/cities";
import { stripEmDashes } from "@/lib/text";

type BoardState = { error?: Record<string, string[]> & { _form?: string[] }; success?: boolean } | null;

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

export async function publishBoardPost(_prevState: BoardState, formData: FormData): Promise<BoardState> {
  const client = await requireGrowthClientId();
  if (client.error) return { error: { _form: [client.error] } };

  // A member posting is a normal, wanted thing, so this is set high enough
  // that nobody legitimate will ever see it. It exists so a broken script or
  // a double-tapped button cannot fill the board.
  if (isRateLimited(`board-post:${client.id}`, 15, 60 * 60 * 1000)) {
    return { error: { _form: ["That is a lot of posts in one hour. Give it a few minutes and try again."] } };
  }

  const parsed = boardPostSchema.safeParse({
    kind: formData.get("kind"),
    title: formData.get("title"),
    body: formData.get("body") || undefined,
    price: formData.get("price") || undefined,
    city: formData.get("city") || undefined,
    cityOther: formData.get("cityOther") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const admin = createAdminClient();
  const { data: growthClient } = await admin
    .from("growth_clients")
    .select("city, industry, slug")
    .eq("id", client.id)
    .single();

  // The area question, asked once. A member with no city saved has no area,
  // so his post would exist on the board and on no area page at all, which
  // is the one thing Phase 1 is for.
  let city = growthClient?.city ?? null;
  if (!city) {
    const chosen = parsed.data.city === OTHER_CITY ? parsed.data.cityOther : parsed.data.city;
    if (!chosen) {
      return { error: { city: ["Choose the town or city you work in so your post appears on its area page"] } };
    }
    city = chosen;
    await admin.from("growth_clients").update({ city }).eq("id", client.id);
    // The member's own page and the marketplace card both show the city.
    if (growthClient?.slug) revalidatePath(`/${growthClient.slug}`);
    revalidatePath("/marketplace");
  }

  let priceCents: number | null = null;
  if (parsed.data.price) {
    priceCents = parseAmountToCents(parsed.data.price);
    if (priceCents === null) {
      return { error: { price: ["That does not look like an amount. Try something like 1200 or R1 200.50"] } };
    }
  }

  // One photo per post. Stored in the bucket the photo gallery already
  // writes to, under a board/ prefix, so no new bucket and no new storage
  // policy is involved.
  let photoPath: string | null = null;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const ext = photo.name.split(".").pop() || "jpg";
    const path = `${client.id}/board/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await admin.storage
      .from("client-photos")
      .upload(path, photo, { contentType: photo.type });
    if (uploadError) {
      return { error: { _form: ["The photo could not be uploaded. Try a smaller file, or post without one."] } };
    }
    photoPath = path;
  }

  const title = stripEmDashes(parsed.data.title);
  const slug = await buildPostSlug(title);

  const { error: insertError } = await admin.from("board_posts").insert({
    growth_client_id: client.id,
    kind: parsed.data.kind,
    title,
    body: parsed.data.body ? stripEmDashes(parsed.data.body) : null,
    price_cents: priceCents,
    photo_path: photoPath,
    slug,
  });

  if (insertError) {
    return { error: { _form: ["Could not publish that, please try again."] } };
  }

  revalidateBoardFor({ city, industry: growthClient?.industry ?? null, postSlug: slug });
  return { success: true };
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
