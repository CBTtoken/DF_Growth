import { createAdminClient } from "@/lib/supabase/admin";
import { areaSlug, buildAreas } from "@/lib/board/areas";
import { categoryFromSlug } from "@/lib/board/categories";
import type { PostKind } from "@/lib/board/kinds";

// Every read the public board does. One place, because the gate on what may
// appear in public is subtle and repeating it in four route files is how a
// cancelled member's post ends up indexed.
//
// The gate is the same one the marketplace and the member page itself use:
// an active client with a published landing page. Nothing else appears,
// which means a post cannot outlive the page it links to.

export type BoardMember = {
  id: string;
  slug: string;
  businessName: string;
  industry: string | null;
  city: string | null;
  logoUrl: string | null;
  brandColor: string;
  whatsapp: string | null;
};

export type BoardPost = {
  id: string;
  slug: string;
  kind: PostKind;
  title: string;
  body: string | null;
  priceCents: number | null;
  photoUrl: string | null;
  publishedAt: string;
  member: BoardMember;
  /** Real KatisoBiz document activity in the last seven days. Never a count, only the fact. */
  activeThisWeek: boolean;
};

const PHOTOS_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-photos`;

export function boardPhotoUrl(path: string | null): string | null {
  return path ? `${PHOTOS_BASE}/${path}` : null;
}

type ClientRow = {
  id: string;
  slug: string;
  business_name: string;
  industry: string | null;
  city: string | null;
  logo_path: string | null;
  brand_primary_color: string | null;
  whatsapp_phone: string | null;
};

function toMember(row: ClientRow): BoardMember {
  return {
    id: row.id,
    slug: row.slug,
    businessName: row.business_name,
    industry: row.industry,
    city: row.city,
    logoUrl: row.logo_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-logos/${row.logo_path}` : null,
    brandColor: row.brand_primary_color || "#1081b8",
    whatsapp: row.whatsapp_phone,
  };
}

/**
 * Every member whose posts are allowed in public, keyed by id.
 *
 * Resolved as its own query rather than as a nested filter on board_posts.
 * A join filter would apply the row limit before the gate, so a page could
 * silently come back short whenever a cancelled member had recent posts.
 */
async function listableMembers(): Promise<Map<string, BoardMember>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("growth_clients")
    .select(
      "id, slug, business_name, industry, city, logo_path, brand_primary_color, whatsapp_phone, landing_pages!inner(published)"
    )
    .eq("status", "active")
    .eq("landing_pages.published", true);

  const members = new Map<string, BoardMember>();
  for (const row of (data ?? []) as unknown as ClientRow[]) {
    members.set(row.id, toMember(row));
  }
  return members;
}

/**
 * Which of these members issued a real KatisoBiz document in the last seven
 * days.
 *
 * Handoff section 4: "Active this week, derived from real KatisoBiz document
 * activity ... it cannot be gamed, because it comes from actual issued
 * documents. Do not expose the underlying counts, only the signal." So this
 * returns a set of ids and the counts never leave the function.
 *
 * `number is not null` is what separates an issued document from a draft:
 * KatisoBiz assigns the number at issue time, which is also why the
 * handover document counts issued documents that way.
 *
 * Live reality on 30 July 2026: bizup_accounts.growth_client_id is null on
 * all 19 accounts, so this correctly returns an empty set for everybody and
 * no post carries the signal yet. It starts working the day a KatisoBiz
 * account is linked to a Growth client, with no change here.
 */
async function activeThisWeekIds(clientIds: string[]): Promise<Set<string>> {
  if (clientIds.length === 0) return new Set();

  const admin = createAdminClient();
  const { data: accounts } = await admin
    .from("bizup_accounts")
    .select("id, growth_client_id")
    .in("growth_client_id", clientIds);

  if (!accounts?.length) return new Set();

  const clientByAccount = new Map<string, string>();
  for (const account of accounts) {
    if (account.growth_client_id) clientByAccount.set(account.id, account.growth_client_id);
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: documents } = await admin
    .from("bizup_documents")
    .select("account_id")
    .in("account_id", [...clientByAccount.keys()])
    .not("number", "is", null)
    .gte("issued_at", sevenDaysAgo);

  const active = new Set<string>();
  for (const document of documents ?? []) {
    const clientId = clientByAccount.get(document.account_id);
    if (clientId) active.add(clientId);
  }
  return active;
}

type PostRow = {
  id: string;
  slug: string;
  kind: PostKind;
  title: string;
  body: string | null;
  price_cents: number | null;
  photo_path: string | null;
  published_at: string;
  growth_client_id: string;
};

async function decorate(rows: PostRow[], members: Map<string, BoardMember>): Promise<BoardPost[]> {
  const visible = rows.filter((row) => members.has(row.growth_client_id));
  const active = await activeThisWeekIds([...new Set(visible.map((r) => r.growth_client_id))]);

  return visible.map((row) => ({
    id: row.id,
    slug: row.slug,
    kind: row.kind,
    title: row.title,
    body: row.body,
    priceCents: row.price_cents,
    photoUrl: boardPhotoUrl(row.photo_path),
    publishedAt: row.published_at,
    member: members.get(row.growth_client_id)!,
    activeThisWeek: active.has(row.growth_client_id),
  }));
}

export type BoardFilter = {
  /** Area slug, e.g. "boksburg". Matched against the member's city. */
  area?: string;
  /** Board category slug, e.g. "skilled-trades-repairs". */
  category?: string;
  kind?: PostKind | null;
  limit?: number;
};

/**
 * The board itself, and every area, category and kind view of it.
 *
 * Ordering is published_at descending and nothing else, ever. The handoff
 * puts engagement ranking out of scope, and there is no engagement column
 * in the schema to rank on even if someone tried.
 */
export async function listPosts(filter: BoardFilter = {}): Promise<BoardPost[]> {
  const { area, category, kind, limit = 60 } = filter;
  const members = await listableMembers();

  let allowed = [...members.values()];
  if (area) allowed = allowed.filter((m) => m.city && areaSlug(m.city) === area);
  if (category) {
    const resolved = categoryFromSlug(category);
    if (!resolved) return [];
    allowed = allowed.filter((m) => m.industry && resolved.subcategories.includes(m.industry));
  }
  if (allowed.length === 0) return [];

  const admin = createAdminClient();
  let query = admin
    .from("board_posts")
    .select("id, slug, kind, title, body, price_cents, photo_path, published_at, growth_client_id")
    .eq("status", "published")
    .in(
      "growth_client_id",
      allowed.map((m) => m.id)
    )
    .order("published_at", { ascending: false })
    .limit(limit);

  if (kind) query = query.eq("kind", kind);

  const { data } = await query;
  return decorate((data ?? []) as PostRow[], members);
}

/** One post for its own page. Returns null when the post or its member is not publicly listable. */
export async function getPostBySlug(slug: string): Promise<BoardPost | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("board_posts")
    .select("id, slug, kind, title, body, price_cents, photo_path, published_at, growth_client_id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!data) return null;

  const members = await listableMembers();
  const decorated = await decorate([data as PostRow], members);
  return decorated[0] ?? null;
}

/** Other posts by the same member, for the bottom of a post page. */
export async function listPostsByMember(memberId: string, excludePostId: string, limit = 3): Promise<BoardPost[]> {
  const members = await listableMembers();
  if (!members.has(memberId)) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("board_posts")
    .select("id, slug, kind, title, body, price_cents, photo_path, published_at, growth_client_id")
    .eq("status", "published")
    .eq("growth_client_id", memberId)
    .neq("id", excludePostId)
    .order("published_at", { ascending: false })
    .limit(limit);

  return decorate((data ?? []) as PostRow[], members);
}

export type BoardArea = { slug: string; name: string; count: number };

/**
 * The areas that exist, with how many members are in each.
 *
 * Built from what members actually say their city is, not from the CITIES
 * dropdown, because the dropdown has a free-text escape hatch and members
 * have used it. An area page exists only when a member is in it, so there
 * are no empty area URLs for a crawler to find.
 */
export async function listAreas(): Promise<BoardArea[]> {
  const members = await listableMembers();
  return buildAreas([...members.values()].map((m) => m.city));
}

/** Resolves an area slug to its display name, or null when no member is in that area. */
export async function findArea(slug: string): Promise<BoardArea | null> {
  const areas = await listAreas();
  return areas.find((a) => a.slug === slug) ?? null;
}

/** Post slugs for the sitemap. */
export async function listPostSlugsForSitemap(): Promise<{ slug: string; publishedAt: string }[]> {
  const posts = await listPosts({ limit: 500 });
  return posts.map((p) => ({ slug: p.slug, publishedAt: p.publishedAt }));
}
