"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { currentVisitor, resolveVisitor } from "@/lib/board/visitor";
import { buildPostSlug } from "@/lib/board/slug";
import { areaSlug } from "@/lib/board/areas";
import { categoryForIndustry } from "@/lib/board/categories";
import { kindMeta } from "@/lib/board/kinds";
import { parseAmountToCents } from "@/lib/bizup/money";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { OTHER_CITY } from "@/lib/cities";
import { stripEmDashes } from "@/lib/text";
import type { ComposerState } from "@/components/board/PostComposer";

// One board, one way to post to it.
//
// Whether this ends up as a business post or a personal one is decided here
// rather than by two separate screens: a signed-in member posting a special
// posts as his business, the same member selling his own fridge ticks a box
// and posts as himself, and somebody who is not signed in always posts as
// themselves. Dewald's point, and the reason there is one composer.
//
// A public post carries its own town and expires after ten days. A business
// post takes its town from the business and never expires, because each one
// is a permanent page that Google can rank, which is the whole reason this
// beats posting the same thing on Facebook.

const PUBLIC_POST_DAYS = 10;

export async function createBoardPost(_prevState: ComposerState, formData: FormData): Promise<ComposerState> {
  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`board-new-post:${ip}`, 10, 60 * 60 * 1000)) {
    return { error: "That is a lot of posts in one hour. Give it a few minutes." };
  }

  const kind = kindMeta(String(formData.get("kind") ?? ""));
  if (!kind) return { error: "Choose what you want to post first." };

  const title = stripEmDashes(String(formData.get("title") ?? "").trim());
  if (title.length < 4) return { error: "Give it a short heading so people know what it is." };
  if (title.length > 90) return { error: "Keep the heading under 90 characters." };

  const bodyRaw = String(formData.get("body") ?? "").trim();
  const body = bodyRaw ? stripEmDashes(bodyRaw) : null;

  // Only where the kind has a price at all. A "looking for" post has no
  // price box, so a price arriving on one is ignored rather than trusted.
  let priceCents: number | null = null;
  if (kind.showPrice) {
    const priceRaw = String(formData.get("price") ?? "").trim();
    if (priceRaw) {
      priceCents = parseAmountToCents(priceRaw);
      if (priceCents === null) {
        return { error: "That does not look like an amount. Try something like 1200 or R1 200.50" };
      }
    }
  }

  const admin = createAdminClient();
  const member = await requireGrowthClientId();
  const asMyself = formData.get("asMyself") === "on";
  const postAsBusiness = Boolean(member.id) && kind.businessByDefault && !asMyself;

  // Where it is. A business post inherits the business's town, so a business
  // that moves does not leave a trail of posts filed under the old one.
  let city: string | null = null;
  let businessCity: string | null = null;
  if (postAsBusiness && member.id) {
    const { data: client } = await admin.from("growth_clients").select("city").eq("id", member.id).single();
    businessCity = client?.city ?? null;
  }

  if (!businessCity) {
    const chosen = String(formData.get("city") ?? "");
    const other = String(formData.get("cityOther") ?? "").trim();
    const resolvedCity = chosen === OTHER_CITY ? other : chosen;
    if (!resolvedCity) return { error: "Choose the town this belongs to, so it lands on the right area page." };
    city = resolvedCity;

    // A business with no town on record gets it saved, once, so it is never
    // asked again and its own page shows it too.
    if (postAsBusiness && member.id) {
      await admin.from("growth_clients").update({ city }).eq("id", member.id);
      businessCity = city;
      city = null;
    }
  }

  // Who is posting, when it is not a business.
  let identityId: string | null = null;
  if (!postAsBusiness) {
    const existing = await currentVisitor();
    const displayName = String(formData.get("displayName") ?? "").trim() || existing?.displayName || "";
    const email = String(formData.get("email") ?? "").trim() || existing?.email || "";

    if (!displayName) return { error: "Enter the name you want on the post." };
    if (!email) return { error: "We need an email so people can reach you about this." };

    if (!existing) {
      const turnstileOk = await verifyTurnstileToken(String(formData.get("turnstileToken") ?? ""), ip);
      if (!turnstileOk) {
        return { error: "Could not confirm you are a person, please reload the page and try again." };
      }
    }

    const resolved = await resolveVisitor({ displayName, email });
    if ("error" in resolved) return { error: resolved.error };
    identityId = resolved.visitor.id;
  }

  // One photo. Same bucket the gallery already writes to, so no new bucket
  // and no new storage policy.
  let photoPath: string | null = null;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const ext = photo.name.split(".").pop() || "jpg";
    const folder = postAsBusiness && member.id ? member.id : "public";
    const path = `${folder}/board/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await admin.storage
      .from("client-photos")
      .upload(path, photo, { contentType: photo.type });
    if (uploadError) {
      return { error: "The photo could not be uploaded. Try a smaller file, or post without one." };
    }
    photoPath = path;
  }

  const slug = await buildPostSlug(title);

  const { error } = await admin.from("board_posts").insert({
    growth_client_id: postAsBusiness ? member.id : null,
    identity_id: identityId,
    author_kind: postAsBusiness ? "member" : "public",
    kind: kind.id,
    title,
    body,
    price_cents: priceCents,
    photo_path: photoPath,
    city,
    slug,
    expires_at: postAsBusiness
      ? null
      : new Date(Date.now() + PUBLIC_POST_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (error) {
    console.error("Could not create a board post", error);
    return { error: "Could not post that, please try again." };
  }

  revalidatePath("/board");
  revalidatePath("/dashboard/board");
  const areaCity = businessCity ?? city;
  if (areaCity) revalidatePath(`/board/area/${areaSlug(areaCity)}`);
  if (postAsBusiness && member.id) {
    const { data: client } = await admin.from("growth_clients").select("industry, slug").eq("id", member.id).single();
    const category = categoryForIndustry(client?.industry ?? null);
    if (category) revalidatePath(`/board/category/${category.slug}`);
  }

  return { success: true, slug };
}
