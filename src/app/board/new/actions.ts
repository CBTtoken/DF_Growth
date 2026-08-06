"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createSessionClient } from "@/lib/supabase/server";
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
import { contactDetailsInBody, autoRuleForNewPost, holdReasonForNewPost, logModeration } from "@/lib/board/moderation";
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
// post takes its town from the business. Since the moderation handoff (job
// 7), a business post also gets its own expiry rather than never expiring --
// see EXPIRY_DAYS below -- but unlike a public post it is never deleted by
// the cron, only taken off browse. Each one is still a permanent page that
// Google can rank, which is the whole reason this beats posting the same
// thing on Facebook.

const PUBLIC_POST_DAYS = 10;
const FOR_SALE_DAYS = 60;
const OFFER_MAX_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

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

  // Job 1: "Every field that has a home must not be accepted in the body."
  const contactHit = contactDetailsInBody(`${title} ${body ?? ""}`);
  if (contactHit === "phone") {
    return {
      error:
        "Looks like a phone number in the description. There's already a way to reach you on every post, so take it out of the description.",
    };
  }
  if (contactHit === "email") {
    return {
      error:
        "Looks like an email address in the description. There's already a way to reach you on every post, so take it out of the description.",
    };
  }

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

  // Job 1: the fields each kind actually needs, checked here so a post
  // missing one cannot reach the database at all.
  const condition = kind.requiresCondition ? String(formData.get("condition") ?? "").trim() : null;
  if (kind.requiresCondition && !condition) {
    return { error: "Choose the condition, so buyers know what they're getting." };
  }

  const savingText = kind.requiresPriceOrSaving ? String(formData.get("savingText") ?? "").trim() || null : null;
  if (kind.requiresPriceOrSaving && !priceCents && !savingText) {
    return { error: 'Add the price, or describe the saving (for example "20% off").' };
  }

  if (kind.id === "for_sale" && !priceCents) {
    return { error: "Add a price. A for-sale post with no price gets skipped." };
  }

  let endDateIso: string | null = null;
  if (kind.requiresEndDate) {
    const raw = String(formData.get("endDate") ?? "").trim();
    const parsed = raw ? new Date(`${raw}T23:59:59`) : null;
    if (!raw || !parsed || Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
      return { error: "Add an end date in the future. An offer with no end date is not an offer." };
    }
    if (parsed.getTime() - Date.now() > OFFER_MAX_DAYS * DAY_MS) {
      return { error: `Keep the end date within ${OFFER_MAX_DAYS} days.` };
    }
    endDateIso = parsed.toISOString();
  }

  const urgency = kind.requiresUrgency ? String(formData.get("urgency") ?? "").trim() : null;
  if (kind.requiresUrgency && !["asap", "this_week", "flexible"].includes(urgency ?? "")) {
    return { error: "Say how urgent it is." };
  }

  const admin = createAdminClient();
  const member = await requireGrowthClientId();
  const asMyself = formData.get("asMyself") === "on";
  const postAsBusiness = Boolean(member.id) && kind.businessByDefault && !asMyself;

  // Job 2, not negotiable: money-attached kinds are member-only, and a
  // lapsed member's subscription closes the door the moment it lapses. This
  // is the friendly, app-level half of the check -- the real backstop is
  // the RLS policy the insert itself runs into below.
  if (kind.author === "member" && !member.id) {
    return { error: "Sign in as an active DigitalFlyer member to post this." };
  }

  // Where it is. A business post inherits the business's town, so a business
  // that moves does not leave a trail of posts filed under the old one.
  //
  // A member posting as himself also inherits it, because the composer hides
  // the town box once his account has one and he lives in the same town he
  // works in. Without this fallback a member could fill in the form, see no
  // town field, and be told to choose a town.
  let city: string | null = null;
  let businessCity: string | null = null;
  let accountCity: string | null = null;
  let accountEmail: string | null = null;
  let accountStatus: string | null = null;

  if (member.id) {
    const { data: client } = await admin
      .from("growth_clients")
      .select("city, contact_email, status")
      .eq("id", member.id)
      .single();
    accountCity = client?.city ?? null;
    accountEmail = client?.contact_email ?? null;
    accountStatus = client?.status ?? null;
    if (postAsBusiness) businessCity = accountCity;
  }

  if (kind.author === "member" && accountStatus !== "active") {
    return {
      error: "This kind of post needs an active subscription. Get in touch if you think this is wrong.",
    };
  }

  if (!postAsBusiness && accountCity) city = accountCity;

  if (!businessCity && !city) {
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

    // A signed-in member posting as himself was never shown an email box,
    // because his account already has one. Demanding it made a "Looking
    // for" post impossible for a member, which is exactly how Dewald found
    // this.
    const displayName = String(formData.get("displayName") ?? "").trim() || existing?.displayName || "";
    const email =
      String(formData.get("email") ?? "").trim() || existing?.email || accountEmail || "";

    if (!displayName) return { error: "Enter the name you want on the post." };
    if (!email) return { error: "We need an email so people can reach you about this." };

    if (!existing && !member.id) {
      const turnstileOk = await verifyTurnstileToken(String(formData.get("turnstileToken") ?? ""), ip);
      if (!turnstileOk) {
        return { error: "Could not confirm you are a person, please reload the page and try again." };
      }
    }

    const resolved = await resolveVisitor({ displayName, email });
    if ("error" in resolved) return { error: resolved.error };
    identityId = resolved.visitor.id;
  }

  // Job 4: the countable, reject-at-submission rules -- frequency cap,
  // duplicate detection, disallowed links, the banned list. Runs after we
  // know who is posting (member or identity) and before anything is
  // uploaded, so a rejected post never costs a photo upload.
  const posterKey = member.id
    ? ({ type: "member", id: member.id } as const)
    : identityId
      ? ({ type: "identity", id: identityId } as const)
      : null;

  const rejected = await autoRuleForNewPost({ kind: kind.id, title, body, posterKey });
  if (rejected) return { error: rejected.reason };

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

  if (kind.requiresPhoto && !photoPath) {
    return { error: "Add at least one photo. A for-sale post needs one." };
  }

  const slug = await buildPostSlug(title);

  // Job 7: a business post now gets its own expiry too, by kind, rather
  // than never expiring. A personal/public post keeps the existing flat
  // period -- unchanged, and still what the cron hard-deletes on.
  let expiresAt: string;
  if (postAsBusiness) {
    if (kind.id === "for_sale") {
      expiresAt = new Date(Date.now() + FOR_SALE_DAYS * DAY_MS).toISOString();
    } else if (endDateIso) {
      expiresAt = endDateIso;
    } else {
      expiresAt = new Date(Date.now() + FOR_SALE_DAYS * DAY_MS).toISOString();
    }
  } else {
    expiresAt = new Date(Date.now() + PUBLIC_POST_DAYS * DAY_MS).toISOString();
  }

  // Job 3/4: payment details, suspected scam wording, health/income claims
  // -- held, never rejected, always reviewed by a person.
  const hold = await holdReasonForNewPost(title, body);

  const payload = {
    growth_client_id: postAsBusiness ? member.id : null,
    posted_by_client_id: member.id || null,
    identity_id: identityId,
    author_kind: postAsBusiness ? "member" : "public",
    kind: kind.id,
    title,
    body,
    price_cents: priceCents,
    condition,
    saving_text: savingText,
    urgency,
    photo_path: photoPath,
    city,
    slug,
    status: hold ? "held" : "published",
    held_reason: hold?.reason ?? null,
    expires_at: expiresAt,
  };

  // Job 2: money-attached kinds are checked again at the database, not only
  // here. A member's own session (subject to RLS) does the insert for any
  // member-authored post; a public visitor, who has no session, always goes
  // through the service-role client exactly as before -- there is no RLS to
  // satisfy on that path since a public post is never money-attached.
  const insertClient = member.id ? await createSessionClient() : admin;
  const { error } = await insertClient.from("board_posts").insert(payload);

  if (error) {
    const isRlsDenied = error.code === "42501" || /row-level security|permission denied/i.test(error.message);
    if (isRlsDenied) {
      console.error("Board post rejected by RLS (entitlement check failed at the database)", error);
      return {
        error: "This kind of post needs an active subscription. Get in touch if you think this is wrong.",
      };
    }
    console.error("Could not create a board post", error);
    return { error: "Could not post that, please try again." };
  }

  if (hold) {
    // The insert used the caller's own client above, which cannot see the
    // row it just wrote past RLS for logging purposes -- read it back with
    // the admin client to attach the moderation-log entry to a real id.
    const { data: created } = await admin.from("board_posts").select("id").eq("slug", slug).maybeSingle();
    if (created) {
      await logModeration({
        targetType: "post",
        targetId: created.id,
        action: "held",
        rule: hold.rule,
        actor: { kind: "system" },
      });
    }
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

  return { success: true, slug: hold ? undefined : slug, held: Boolean(hold) };
}
