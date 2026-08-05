import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { truncateOnWord, stripEmDashes } from "@/lib/text";
import { featureLabel } from "@/lib/meta/page-poster-features";

// Queue generation for Facebook/HANDOFF-digitalflyer-page-poster.md, on
// the fixed three-anchor schedule Dewald asked for in chat on 5 August
// 2026 (superseding the original jittered-window design): 08:15 our own
// feature CTA (required), 13:30 a second one (only when queued), 20:15
// one member post a day, new member first, then a fresh Board offer,
// then spotlight rotation. Reads eligible members, Board offers and the
// feature-CTA pool, writes rows a week or two ahead at pending_approval.
// Never publishes anything itself, see page-poster-publish for that half.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://growth.digitalflyersa.co.za";
const CLIENT_PHOTOS_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-photos`;

// South Africa has run one fixed UTC+2 offset year round since 1994 (no
// DST), so a plain offset is safe here.
const SAST_OFFSET_MINUTES = 120;

type SlotKey = "morning_feature" | "midday_feature" | "evening_member";

const FIXED_SLOTS: { key: SlotKey; hour: number; minute: number; required: boolean }[] = [
  { key: "morning_feature", hour: 8, minute: 15, required: true },
  { key: "midday_feature", hour: 13, minute: 30, required: false },
  { key: "evening_member", hour: 20, minute: 15, required: true },
];

// A few minutes either side of the anchor, so it doesn't read as a script
// firing at the exact same second every day, while staying close enough
// to the clock time Dewald actually wants to plan around.
const WOBBLE_MINUTES = 5;

function sastMinutesToUtc(dateOnly: string, minutesFromMidnight: number): Date {
  const [y, m, d] = dateOnly.split("-").map(Number);
  const utcMs = Date.UTC(y, m - 1, d, 0, minutesFromMidnight, 0) - SAST_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMs);
}

function randomInt(maxExclusive: number): number {
  return crypto.randomInt(maxExclusive);
}

function wobble(minute: number): number {
  return minute + randomInt(WOBBLE_MINUTES * 2 + 1) - WOBBLE_MINUTES;
}

// Fisher-Yates using crypto randomness, not Math.random, so the shuffle
// that decides featuring order cannot be predicted or nudged.
function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type GrowthClient = {
  id: string;
  business_name: string;
  slug: string;
  industry: string | null;
  city: string | null;
  business_description: string | null;
};

function clientLink(client: GrowthClient): string {
  return `${SITE_URL}/${client.slug}`;
}

function oneLiner(client: GrowthClient, max: number): string {
  const raw = client.business_description?.trim();
  if (!raw) return "";
  return truncateOnWord(raw, max);
}

// "The member is the hero and DigitalFlyer is small in it" (handoff Sec 2).
// Evening only carries one post now, so there's no separate short variant
// to maintain, this is always the considered-length version.
function newMemberCopy(client: GrowthClient): string {
  const where = client.city ? ` in ${client.city}` : "";
  const trade = client.industry ? `${client.industry}${where}` : `A new business${where}`;
  const line = oneLiner(client, 120);
  return stripEmDashes(
    `Say hello to ${client.business_name}, ${trade}.${line ? ` ${line}` : ""} Have a look and pass it on if you know someone who needs them: ${clientLink(client)}`
  );
}

function spotlightCopy(client: GrowthClient): string {
  const where = client.city ? ` in ${client.city}` : "";
  const trade = client.industry ?? "business";
  const line = oneLiner(client, 130);
  return stripEmDashes(`Meet ${client.business_name}, ${trade}${where}.${line ? ` ${line}` : ""} ${clientLink(client)}`);
}

type BoardPost = {
  id: string;
  growth_client_id: string;
  kind: string;
  title: string;
  body: string | null;
  price_cents: number | null;
  photo_path: string | null;
  slug: string;
};

function boardHighlightCopy(post: BoardPost, businessName: string): { message: string; link: string } {
  const price = post.price_cents != null ? ` R${(post.price_cents / 100).toFixed(0)}` : "";
  const link = `${SITE_URL}/board/post/${post.slug}`;
  return {
    message: stripEmDashes(
      `${businessName} has posted on the Board: ${post.title}${price}.${post.body ? ` ${truncateOnWord(post.body, 140)}` : ""} ${link}`
    ),
    link,
  };
}

async function fetchPhotoUrl(
  admin: ReturnType<typeof createAdminClient>,
  client: GrowthClient & { hero_photo_id: string | null }
): Promise<string | null> {
  if (client.hero_photo_id) {
    const { data } = await admin.from("client_photos").select("storage_path").eq("id", client.hero_photo_id).maybeSingle();
    if (data) return `${CLIENT_PHOTOS_BASE}/${data.storage_path}`;
  }
  const { data } = await admin
    .from("client_photos")
    .select("storage_path")
    .eq("growth_client_id", client.id)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ? `${CLIENT_PHOTOS_BASE}/${data.storage_path}` : null;
}

export type GenerateResult = {
  daysProcessed: number;
  queued: { new_member: number; spotlight: number; board_highlight: number; feature_cta: number };
};

// Tops the queue up to `daysAhead` days from tomorrow. Idempotent per
// day+slot: a slot that already has a non-rejected row is left alone, so
// calling this daily from cron only ever fills the gap it needs to.
export async function generatePagePosterQueue(daysAhead = 14): Promise<GenerateResult> {
  const admin = createAdminClient();
  const queued = { new_member: 0, spotlight: 0, board_highlight: 0, feature_cta: 0 };

  const today = new Date();
  const days: string[] = [];
  for (let i = 1; i <= daysAhead; i++) {
    days.push(dateOnly(new Date(today.getTime() + i * 24 * 60 * 60 * 1000)));
  }

  const { data: existingRows } = await admin
    .from("page_poster_queue")
    .select("slot, scheduled_for")
    .gte("scheduled_for", sastMinutesToUtc(days[0], 0).toISOString())
    .neq("status", "rejected");
  const filledSlots = new Set<string>();
  for (const row of existingRows ?? []) {
    const sast = new Date(new Date(row.scheduled_for).getTime() + SAST_OFFSET_MINUTES * 60 * 1000);
    filledSlots.add(`${sast.toISOString().slice(0, 10)}|${row.slot}`);
  }

  // Every (day, slot) still needing a row, in chronological order. A day
  // already fully covered contributes nothing here.
  type OpenSlot = { date: string; slot: SlotKey; minute: number; required: boolean };
  const openSlots: OpenSlot[] = [];
  for (const day of days) {
    for (const spec of FIXED_SLOTS) {
      if (filledSlots.has(`${day}|${spec.key}`)) continue;
      openSlots.push({ date: day, slot: spec.key, minute: wobble(spec.hour * 60 + spec.minute), required: spec.required });
    }
  }
  if (openSlots.length === 0) return { daysProcessed: 0, queued };

  // --- Member candidates for the 20:15 slot: new_member, then a fresh
  // Board offer, then spotlight rotation ---
  const { data: eligibleClients } = await admin
    .from("growth_clients")
    .select(
      "id, business_name, slug, industry, city, business_description, hero_photo_id, landing_pages!inner(published)"
    )
    .eq("status", "active")
    .eq("unlisted", false)
    .eq("landing_pages.published", true);

  const clientList = (eligibleClients ?? []) as unknown as (GrowthClient & { hero_photo_id: string | null })[];

  const { data: photoOwners } = await admin.from("client_photos").select("growth_client_id");
  const clientsWithPhotos = new Set((photoOwners ?? []).map((r) => r.growth_client_id));
  const eligible = clientList.filter((c) => clientsWithPhotos.has(c.id));

  const { data: stateRows } = await admin
    .from("page_poster_client_state")
    .select("growth_client_id, last_featured_at, new_member_posted_at")
    .in("growth_client_id", eligible.map((c) => c.id));
  const stateByClient = new Map((stateRows ?? []).map((r) => [r.growth_client_id, r]));

  const newMemberQueue = shuffle(eligible.filter((c) => !stateByClient.get(c.id)?.new_member_posted_at));

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: alreadyQueuedBoardIds } = await admin
    .from("page_poster_queue")
    .select("board_post_id")
    .not("board_post_id", "is", null)
    .neq("status", "rejected");
  const queuedBoardIdSet = new Set((alreadyQueuedBoardIds ?? []).map((r) => r.board_post_id));
  const { data: offers } = await admin
    .from("board_posts")
    .select("id, growth_client_id, kind, title, body, price_cents, photo_path, slug")
    .eq("kind", "offer")
    .eq("status", "published")
    .gte("created_at", fourteenDaysAgo)
    .order("created_at", { ascending: true });
  const boardQueue = ((offers ?? []) as BoardPost[]).filter((o) => !queuedBoardIdSet.has(o.id));
  const boardClientIds = [...new Set(boardQueue.map((o) => o.growth_client_id))];
  const { data: boardClients } = boardClientIds.length
    ? await admin.from("growth_clients").select("id, business_name").in("id", boardClientIds)
    : { data: [] as { id: string; business_name: string }[] };
  const nameById = new Map((boardClients ?? []).map((c) => [c.id, c.business_name]));

  const usedAsNewMemberIds = new Set(newMemberQueue.map((c) => c.id));
  const neverFeatured = shuffle(
    eligible.filter((c) => !usedAsNewMemberIds.has(c.id) && !stateByClient.get(c.id)?.last_featured_at)
  );
  const everFeatured = eligible
    .filter((c) => !usedAsNewMemberIds.has(c.id) && stateByClient.get(c.id)?.last_featured_at)
    .sort((a, b) => {
      const at = new Date(stateByClient.get(a.id)!.last_featured_at!).getTime();
      const bt = new Date(stateByClient.get(b.id)!.last_featured_at!).getTime();
      return at - bt;
    });
  const spotlightQueue = [...neverFeatured, ...everFeatured];

  // --- Feature-CTA pool for the 08:15/13:30 slots ---
  // Never-used first, then oldest-used first, and never-used ties broken
  // by paste order (created_at). No shuffle here, unlike member spotlight
  // rotation — a batch is a deliberate sequence someone chose (Dewald,
  // 5 August 2026: "based on how the batch consumes, in the order
  // pasted"), not a pool where fairness among equals matters.
  const { data: featurePosts } = await admin
    .from("page_poster_evergreen")
    .select("id, slot, body, link_url, feature_key, used_at")
    .order("used_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });
  const featureQueue = [...(featurePosts ?? [])];
  const { data: featureImages } = await admin.from("page_poster_feature_images").select("feature_key, photo_url");
  const imageByFeature = new Map((featureImages ?? []).map((f) => [f.feature_key, f.photo_url]));

  const rowsToInsert: Record<string, unknown>[] = [];
  const clientStateUpdates = new Map<string, { last_featured_at?: string; new_member_posted_at?: string }>();
  const usedEvergreenIds: string[] = [];
  let newMemberIdx = 0;
  let boardIdx = 0;
  let spotlightIdx = 0;

  for (const openSlot of openSlots) {
    const scheduledFor = sastMinutesToUtc(openSlot.date, openSlot.minute);

    if (openSlot.slot === "evening_member") {
      if (newMemberIdx < newMemberQueue.length) {
        const client = newMemberQueue[newMemberIdx++];
        rowsToInsert.push({
          post_type: "new_member",
          growth_client_id: client.id,
          board_post_id: null,
          evergreen_id: null,
          message: newMemberCopy(client),
          link_url: clientLink(client),
          photo_url: await fetchPhotoUrl(admin, client),
          slot: openSlot.slot,
          scheduled_for: scheduledFor.toISOString(),
        });
        queued.new_member++;
        clientStateUpdates.set(client.id, { ...clientStateUpdates.get(client.id), new_member_posted_at: scheduledFor.toISOString() });
      } else if (boardIdx < boardQueue.length) {
        const post = boardQueue[boardIdx++];
        const copy = boardHighlightCopy(post, nameById.get(post.growth_client_id) ?? "A member");
        rowsToInsert.push({
          post_type: "board_highlight",
          growth_client_id: post.growth_client_id,
          board_post_id: post.id,
          evergreen_id: null,
          message: copy.message,
          link_url: copy.link,
          photo_url: post.photo_path ? `${CLIENT_PHOTOS_BASE}/${post.photo_path}` : null,
          slot: openSlot.slot,
          scheduled_for: scheduledFor.toISOString(),
        });
        queued.board_highlight++;
      } else if (spotlightIdx < spotlightQueue.length) {
        const client = spotlightQueue[spotlightIdx++];
        rowsToInsert.push({
          post_type: "spotlight",
          growth_client_id: client.id,
          board_post_id: null,
          evergreen_id: null,
          message: spotlightCopy(client),
          link_url: clientLink(client),
          photo_url: await fetchPhotoUrl(admin, client),
          slot: openSlot.slot,
          scheduled_for: scheduledFor.toISOString(),
        });
        queued.spotlight++;
        clientStateUpdates.set(client.id, { ...clientStateUpdates.get(client.id), last_featured_at: scheduledFor.toISOString() });
      }
      // Nothing eligible at all: this evening slot just stays open, next
      // generate run will try again once something is.
      continue;
    }

    // morning_feature / midday_feature: draw from the feature-CTA pool.
    // 08:15 is "required" in intent but still can't force content that
    // doesn't exist; 13:30 only fires when there's a second post to give
    // it, exactly as asked ("when we decide a general product post").
    const picked = featureQueue.shift();
    if (!picked) continue;
    rowsToInsert.push({
      post_type: "feature_cta",
      growth_client_id: null,
      board_post_id: null,
      evergreen_id: picked.id,
      message: picked.body,
      link_url: picked.link_url,
      photo_url: picked.feature_key ? (imageByFeature.get(picked.feature_key) ?? null) : null,
      slot: openSlot.slot,
      scheduled_for: scheduledFor.toISOString(),
    });
    usedEvergreenIds.push(picked.id);
    queued.feature_cta++;
  }

  if (rowsToInsert.length > 0) {
    const { error } = await admin.from("page_poster_queue").insert(rowsToInsert);
    if (error) {
      console.error("page poster queue insert failed", error);
      return { daysProcessed: 0, queued: { new_member: 0, spotlight: 0, board_highlight: 0, feature_cta: 0 } };
    }
  }

  for (const [growth_client_id, update] of clientStateUpdates) {
    await admin
      .from("page_poster_client_state")
      .upsert({ growth_client_id, ...update, updated_at: new Date().toISOString() }, { onConflict: "growth_client_id" });
  }

  if (usedEvergreenIds.length > 0) {
    await admin.from("page_poster_evergreen").update({ used_at: new Date().toISOString() }).in("id", usedEvergreenIds);
  }

  const daysWithAnyOpenSlot = new Set(openSlots.map((s) => s.date)).size;
  return { daysProcessed: daysWithAnyOpenSlot, queued };
}

export { featureLabel };
