import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { truncateOnWord, stripEmDashes } from "@/lib/text";

// Queue generation for Facebook/HANDOFF-digitalflyer-page-poster.md. Reads
// eligible members, Board offers and the evergreen file, and writes rows
// into page_poster_queue a week ahead, at pending_approval, for Dewald to
// act on. Never publishes anything itself — see page-poster-publish cron
// for that half.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://growth.digitalflyersa.co.za";
const CLIENT_PHOTOS_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-photos`;

// South Africa has run one fixed UTC+2 offset year round since 1994 (no
// DST), so a plain offset is safe here unlike most other timezones — see
// the same reasoning already relied on elsewhere in this codebase's date
// handling. Windows chosen from the handoff's own language: morning is
// short and early, evening is longer and carries more weight. No overnight
// posting, ever.
const SAST_OFFSET_MINUTES = 120;
const MORNING_WINDOW = { startMinute: 8 * 60, endMinute: 11 * 60 + 30 };
const EVENING_WINDOW = { startMinute: 16 * 60, endMinute: 19 * 60 + 30 };
const MIN_GAP_MINUTES = 90;

type Slot = "morning" | "evening";

function sastMinutesToUtc(dateOnly: string, minutesFromMidnight: number): Date {
  const [y, m, d] = dateOnly.split("-").map(Number);
  // Construct directly in UTC, then subtract the SAST offset, so the wall
  // clock time entered here (e.g. "09:15 on the 12th") lands as 09:15 in
  // Johannesburg regardless of the machine's own local timezone.
  const utcMs = Date.UTC(y, m - 1, d, 0, minutesFromMidnight, 0) - SAST_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMs);
}

function randomInt(maxExclusive: number): number {
  return crypto.randomInt(maxExclusive);
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

// Random times inside one window, spaced by at least MIN_GAP_MINUTES, so a
// day with more than one post in the same window still doesn't cluster —
// "jitter, not fixed clock times" from the handoff, with the one hard rule
// (minimum gap) it also asks for. Classic gaps method: pick `count` random
// offsets inside the span left over once every minimum gap is reserved,
// sort them, then re-add each gap back in order — that guarantees both the
// minimum spacing and that the last pick never overflows the window, which
// a running-cursor-plus-random approach cannot guarantee.
function jitteredTimesInWindow(window: { startMinute: number; endMinute: number }, count: number): number[] {
  if (count <= 0) return [];
  const span = window.endMinute - window.startMinute;
  const reserved = MIN_GAP_MINUTES * (count - 1);
  if (reserved >= span) {
    // More posts requested than the window can space fairly at the minimum
    // gap. Falls back to even spacing rather than refusing to schedule,
    // still guaranteed to stay inside the window.
    return Array.from({ length: count }, (_, i) => window.startMinute + Math.round((span * i) / Math.max(count - 1, 1)));
  }
  const usable = span - reserved;
  const offsets = Array.from({ length: count }, () => randomInt(usable + 1)).sort((a, b) => a - b);
  return offsets.map((offset, i) => window.startMinute + offset + i * MIN_GAP_MINUTES);
}

type GrowthClient = {
  id: string;
  business_name: string;
  slug: string;
  industry: string | null;
  city: string | null;
  business_description: string | null;
};

type QueueCandidate = {
  post_type: "new_member" | "spotlight" | "board_highlight" | "evergreen";
  growth_client_id: string | null;
  board_post_id: string | null;
  evergreen_id: string | null;
  message_short: string;
  message_long: string;
  link_url: string | null;
  photo_url: string | null;
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
// No superlatives, no invented facts, nothing that reads as an advert with
// a member attached, no CIPC/"verified" language. Two lengths per type:
// short for the morning slot, longer for evening.
function newMemberCopy(client: GrowthClient): { short: string; long: string } {
  const where = client.city ? ` in ${client.city}` : "";
  const trade = client.industry ? `${client.industry}${where}` : `A new business${where}`;
  const line = oneLiner(client, 120);
  return {
    short: stripEmDashes(`New on DigitalFlyer: ${client.business_name}, ${trade}. ${clientLink(client)}`),
    long: stripEmDashes(
      `Say hello to ${client.business_name}, ${trade}.${line ? ` ${line}` : ""} Have a look and pass it on if you know someone who needs them: ${clientLink(client)}`
    ),
  };
}

function spotlightCopy(client: GrowthClient): { short: string; long: string } {
  const where = client.city ? ` in ${client.city}` : "";
  const trade = client.industry ?? "business";
  const line = oneLiner(client, 130);
  return {
    short: stripEmDashes(`${client.business_name}, ${trade}${where}. ${clientLink(client)}`),
    long: stripEmDashes(
      `Meet ${client.business_name}, ${trade}${where}.${line ? ` ${line}` : ""} ${clientLink(client)}`
    ),
  };
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

function boardHighlightCopy(post: BoardPost, businessName: string): { short: string; long: string; link: string } {
  const price = post.price_cents != null ? ` R${(post.price_cents / 100).toFixed(0)}` : "";
  const link = `${SITE_URL}/board/post/${post.slug}`;
  return {
    short: stripEmDashes(`On the Board: ${post.title}${price} from ${businessName}. ${link}`),
    long: stripEmDashes(
      `${businessName} has posted on the Board: ${post.title}${price}.${post.body ? ` ${truncateOnWord(post.body, 140)}` : ""} ${link}`
    ),
    link,
  };
}

async function fetchPhotoUrl(admin: ReturnType<typeof createAdminClient>, client: GrowthClient & { hero_photo_id: string | null }): Promise<string | null> {
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
  queued: { new_member: number; spotlight: number; board_highlight: number; evergreen: number };
};

// Tops the queue up to `daysAhead` days from tomorrow. Idempotent: a day
// that already has settings.posts_per_day rows queued (any status) is left
// alone, so calling this daily from cron only ever fills the gap it needs
// to, and re-running after a partial failure never double-books a day.
export async function generatePagePosterQueue(daysAhead = 7): Promise<GenerateResult> {
  const admin = createAdminClient();
  const queued = { new_member: 0, spotlight: 0, board_highlight: 0, evergreen: 0 };

  const { data: settingsRow } = await admin.from("page_poster_settings").select("posts_per_day").eq("id", 1).single();
  const postsPerDay = settingsRow?.posts_per_day ?? 2;
  if (postsPerDay <= 0) return { daysProcessed: 0, queued };

  // Which of the next `daysAhead` days already have a full queue.
  const today = new Date();
  const days: string[] = [];
  for (let i = 1; i <= daysAhead; i++) {
    days.push(dateOnly(new Date(today.getTime() + i * 24 * 60 * 60 * 1000)));
  }

  const { data: existingRows } = await admin
    .from("page_poster_queue")
    .select("scheduled_for")
    .gte("scheduled_for", sastMinutesToUtc(days[0], 0).toISOString())
    .neq("status", "rejected");
  const countByDay = new Map<string, number>();
  for (const row of existingRows ?? []) {
    // Convert back to SAST date for the count so a post scheduled at
    // 23:xx SAST doesn't get miscounted against the wrong UTC day.
    const sast = new Date(new Date(row.scheduled_for).getTime() + SAST_OFFSET_MINUTES * 60 * 1000);
    const key = sast.toISOString().slice(0, 10);
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
  }

  const daysNeedingFill = days.filter((d) => (countByDay.get(d) ?? 0) < postsPerDay);
  if (daysNeedingFill.length === 0) return { daysProcessed: 0, queued };

  // Build the flattened, chronological slot list across the days that need
  // filling: for each such day, top it up from its current count to
  // postsPerDay, evening-weighted on an odd split.
  type SlotSpec = { date: string; slot: Slot; minute: number };
  const slots: SlotSpec[] = [];
  for (const day of daysNeedingFill) {
    const have = countByDay.get(day) ?? 0;
    const need = postsPerDay - have;
    const eveningCount = Math.ceil(need / 2);
    const morningCount = need - eveningCount;
    const morningTimes = jitteredTimesInWindow(MORNING_WINDOW, morningCount);
    const eveningTimes = jitteredTimesInWindow(EVENING_WINDOW, eveningCount);
    for (const t of morningTimes) slots.push({ date: day, slot: "morning", minute: t });
    for (const t of eveningTimes) slots.push({ date: day, slot: "evening", minute: t });
  }
  slots.sort((a, b) => (a.date === b.date ? a.minute - b.minute : a.date.localeCompare(b.date)));
  if (slots.length === 0) return { daysProcessed: daysNeedingFill.length, queued };

  // --- Candidate pools, in priority order ---
  const candidates: QueueCandidate[] = [];

  const { data: eligibleClients } = await admin
    .from("growth_clients")
    .select(
      "id, business_name, slug, industry, city, business_description, hero_photo_id, landing_pages!inner(published)"
    )
    .eq("status", "active")
    .eq("unlisted", false)
    .eq("landing_pages.published", true);

  const clientList = (eligibleClients ?? []) as unknown as (GrowthClient & { hero_photo_id: string | null })[];

  // Only clients with at least one photo are eligible (handoff Sec 3).
  const { data: photoOwners } = await admin.from("client_photos").select("growth_client_id");
  const clientsWithPhotos = new Set((photoOwners ?? []).map((r) => r.growth_client_id));
  const eligible = clientList.filter((c) => clientsWithPhotos.has(c.id));

  const { data: stateRows } = await admin
    .from("page_poster_client_state")
    .select("growth_client_id, last_featured_at, new_member_posted_at")
    .in("growth_client_id", eligible.map((c) => c.id));
  const stateByClient = new Map((stateRows ?? []).map((r) => [r.growth_client_id, r]));

  // New member: never posted before, exactly once, highest priority.
  const newMemberClients = shuffle(eligible.filter((c) => !stateByClient.get(c.id)?.new_member_posted_at));
  const usedAsNewMemberIds = new Set<string>();
  for (const client of newMemberClients) {
    const copy = newMemberCopy(client);
    candidates.push({
      post_type: "new_member",
      growth_client_id: client.id,
      board_post_id: null,
      evergreen_id: null,
      message_short: copy.short,
      message_long: copy.long,
      link_url: clientLink(client),
      photo_url: await fetchPhotoUrl(admin, client),
    });
    usedAsNewMemberIds.add(client.id);
  }

  // Spotlight: fair rotation, oldest/never-featured first, shuffled within
  // ties (in practice the "never featured" bucket, since timestamps rarely
  // collide exactly). Excludes anyone queued above as new_member this run,
  // so nobody is announced twice on the same pass.
  const spotlightPool = eligible.filter((c) => !usedAsNewMemberIds.has(c.id));
  const neverFeatured = shuffle(spotlightPool.filter((c) => !stateByClient.get(c.id)?.last_featured_at));
  const everFeatured = spotlightPool
    .filter((c) => stateByClient.get(c.id)?.last_featured_at)
    .sort((a, b) => {
      const at = new Date(stateByClient.get(a.id)!.last_featured_at!).getTime();
      const bt = new Date(stateByClient.get(b.id)!.last_featured_at!).getTime();
      return at - bt;
    });
  const spotlightOrder = [...neverFeatured, ...everFeatured];
  const spotlightCandidates: QueueCandidate[] = [];
  for (const client of spotlightOrder) {
    const copy = spotlightCopy(client);
    spotlightCandidates.push({
      post_type: "spotlight",
      growth_client_id: client.id,
      board_post_id: null,
      evergreen_id: null,
      message_short: copy.short,
      message_long: copy.long,
      link_url: clientLink(client),
      photo_url: await fetchPhotoUrl(admin, client),
    });
  }

  // Board highlight: offers not already queued in any non-rejected state,
  // posted in the last 14 days (older offers are likely stale).
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

  const offerRows = ((offers ?? []) as BoardPost[]).filter((o) => !queuedBoardIdSet.has(o.id));
  const offerClientIds = [...new Set(offerRows.map((o) => o.growth_client_id))];
  const { data: offerClients } = await admin.from("growth_clients").select("id, business_name").in("id", offerClientIds);
  const nameById = new Map((offerClients ?? []).map((c) => [c.id, c.business_name]));

  const boardCandidates: QueueCandidate[] = offerRows.map((post) => {
    const copy = boardHighlightCopy(post, nameById.get(post.growth_client_id) ?? "A member");
    return {
      post_type: "board_highlight",
      growth_client_id: post.growth_client_id,
      board_post_id: post.id,
      evergreen_id: null,
      message_short: copy.short,
      message_long: copy.long,
      link_url: copy.link,
      photo_url: post.photo_path ? `${CLIENT_PHOTOS_BASE}/${post.photo_path}` : null,
    };
  });

  // Interleave spotlight and board highlights so a busy week of offers
  // doesn't crowd every spotlight out, and vice versa.
  const interleaved: QueueCandidate[] = [];
  const maxLen = Math.max(spotlightCandidates.length, boardCandidates.length);
  for (let i = 0; i < maxLen; i++) {
    if (spotlightCandidates[i]) interleaved.push(spotlightCandidates[i]);
    if (boardCandidates[i]) interleaved.push(boardCandidates[i]);
  }

  // Evergreen: fills whatever is left, never-used first, cycling the whole
  // table once every row has had a turn.
  const { data: evergreenRows } = await admin
    .from("page_poster_evergreen")
    .select("id, slot, body, link_url, used_at")
    .order("used_at", { ascending: true, nullsFirst: true });
  const evergreenPool = shuffle(evergreenRows ?? []);

  candidates.push(...interleaved);

  // --- Assign candidates to slots, respecting evening-gets-the-longer-copy ---
  const clientStateUpdates = new Map<string, { last_featured_at?: string; new_member_posted_at?: string }>();
  const rowsToInsert: Record<string, unknown>[] = [];
  let candidateIndex = 0;
  const evergreenUsedIds: string[] = [];

  for (const slotSpec of slots) {
    const scheduledFor = sastMinutesToUtc(slotSpec.date, slotSpec.minute);
    const candidate = candidates[candidateIndex];

    // Evergreen only once the real candidate pools are exhausted, matched
    // to the slot it's meant for where the pool allows it.
    if (!candidate) {
      const matchIdx = evergreenPool.findIndex((e) => e.slot === slotSpec.slot);
      const picked = matchIdx >= 0 ? evergreenPool.splice(matchIdx, 1)[0] : evergreenPool.shift();
      if (!picked) continue; // Nothing left anywhere to fill this slot with.
      rowsToInsert.push({
        post_type: "evergreen",
        growth_client_id: null,
        board_post_id: null,
        evergreen_id: picked.id,
        message: picked.body,
        link_url: picked.link_url,
        photo_url: null,
        slot: slotSpec.slot,
        scheduled_for: scheduledFor.toISOString(),
      });
      evergreenUsedIds.push(picked.id);
      queued.evergreen++;
      continue;
    }

    candidateIndex++;
    rowsToInsert.push({
      post_type: candidate.post_type,
      growth_client_id: candidate.growth_client_id,
      board_post_id: candidate.board_post_id,
      evergreen_id: null,
      message: slotSpec.slot === "morning" ? candidate.message_short : candidate.message_long,
      link_url: candidate.link_url,
      photo_url: candidate.photo_url,
      slot: slotSpec.slot,
      scheduled_for: scheduledFor.toISOString(),
    });
    queued[candidate.post_type]++;

    if (candidate.post_type === "new_member" && candidate.growth_client_id) {
      clientStateUpdates.set(candidate.growth_client_id, {
        ...clientStateUpdates.get(candidate.growth_client_id),
        new_member_posted_at: scheduledFor.toISOString(),
      });
    }
    if (candidate.post_type === "spotlight" && candidate.growth_client_id) {
      clientStateUpdates.set(candidate.growth_client_id, {
        ...clientStateUpdates.get(candidate.growth_client_id),
        last_featured_at: scheduledFor.toISOString(),
      });
    }
  }

  if (rowsToInsert.length > 0) {
    const { error } = await admin.from("page_poster_queue").insert(rowsToInsert);
    if (error) {
      console.error("page poster queue insert failed", error);
      return { daysProcessed: 0, queued: { new_member: 0, spotlight: 0, board_highlight: 0, evergreen: 0 } };
    }
  }

  for (const [growth_client_id, update] of clientStateUpdates) {
    await admin
      .from("page_poster_client_state")
      .upsert({ growth_client_id, ...update, updated_at: new Date().toISOString() }, { onConflict: "growth_client_id" });
  }

  if (evergreenUsedIds.length > 0) {
    await admin.from("page_poster_evergreen").update({ used_at: new Date().toISOString() }).in("id", evergreenUsedIds);
  }

  return { daysProcessed: daysNeedingFill.length, queued };
}
