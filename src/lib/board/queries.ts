import { createAdminClient } from "@/lib/supabase/admin";
import { areaSlug, buildAreas } from "@/lib/board/areas";
import { categoryFromSlug } from "@/lib/board/categories";
import type { PostKind } from "@/lib/board/kinds";

// Every read the public board does. One place, because the gate on what may
// appear in public is subtle and repeating it in four route files is how a
// cancelled member's post ends up indexed.
//
// One board, two kinds of author. A post belongs to a business or to a
// person, never both, and the database enforces that rather than trusting
// this file to. A business post only appears while that business is active
// with a published page, so a post can never outlive the page it links to.

export type BoardMember = {
  id: string;
  slug: string;
  businessName: string;
  industry: string | null;
  city: string | null;
  logoUrl: string | null;
  brandColor: string;
  whatsapp: string | null;
  chatEnabled: boolean;
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
  /** The business, when a business posted it. Null when a person did. */
  member: BoardMember | null;
  /** The person's name, when a person posted it. Null when a business did. */
  personName: string | null;
  /** Whoever posted it, for display. */
  authorName: string;
  /** Resolved from the business, or from the post itself for a person. */
  city: string | null;
  /** Real KatisoBiz document activity in the last seven days. Never a count, only the fact. */
  activeThisWeek: boolean;
  /** Job 7: past its expiry, but a business post stays reachable and indexed regardless. */
  isExpired: boolean;
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
  chat_enabled: boolean | null;
};

function toMember(row: ClientRow): BoardMember {
  return {
    id: row.id,
    slug: row.slug,
    businessName: row.business_name,
    industry: row.industry,
    city: row.city,
    logoUrl: row.logo_path
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-logos/${row.logo_path}`
      : null,
    brandColor: row.brand_primary_color || "#1081b8",
    whatsapp: row.whatsapp_phone,
    chatEnabled: row.chat_enabled !== false,
  };
}

/** Every business whose posts are allowed in public, keyed by id. */
async function listableMembers(): Promise<Map<string, BoardMember>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("growth_clients")
    .select(
      "id, slug, business_name, industry, city, logo_path, brand_primary_color, whatsapp_phone, chat_enabled, landing_pages!inner(published)"
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
 * Which of these businesses issued a real KatisoBiz document in the last
 * seven days, or renewed a board post in the last seven days. A set, never
 * a count, so the underlying numbers never leave.
 *
 * Live reality: bizup_accounts.growth_client_id is null on every account,
 * so the KatisoBiz half correctly returns nobody until the two products are
 * linked -- the renewal half (job 7: "a member renewing a post is telling
 * you they are still trading") works regardless, since it only needs the
 * Board's own data.
 */
async function activeThisWeekIds(clientIds: string[]): Promise<Set<string>> {
  if (clientIds.length === 0) return new Set();

  const admin = createAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: accounts }, { data: renewed }] = await Promise.all([
    admin.from("bizup_accounts").select("id, growth_client_id").in("growth_client_id", clientIds),
    admin
      .from("board_posts")
      .select("growth_client_id")
      .in("growth_client_id", clientIds)
      .gte("last_renewed_at", sevenDaysAgo),
  ]);

  const active = new Set<string>();
  for (const row of renewed ?? []) {
    if (row.growth_client_id) active.add(row.growth_client_id);
  }

  if (accounts?.length) {
    const clientByAccount = new Map<string, string>();
    for (const account of accounts) {
      if (account.growth_client_id) clientByAccount.set(account.id, account.growth_client_id);
    }

    const { data: documents } = await admin
      .from("bizup_documents")
      .select("account_id")
      .in("account_id", [...clientByAccount.keys()])
      .not("number", "is", null)
      .gte("issued_at", sevenDaysAgo);

    for (const document of documents ?? []) {
      const clientId = clientByAccount.get(document.account_id);
      if (clientId) active.add(clientId);
    }
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
  growth_client_id: string | null;
  identity_id: string | null;
  author_kind: "member" | "public";
  city: string | null;
  expires_at: string | null;
};

const POST_COLUMNS =
  "id, slug, kind, title, body, price_cents, photo_path, published_at, growth_client_id, identity_id, author_kind, city, expires_at";

async function decorate(
  rows: PostRow[],
  members: Map<string, BoardMember>,
  /** Job 7: a business post stays reachable at its own URL past its expiry -- browse and area/category pages never do. */
  options: { includeExpiredMemberPosts?: boolean } = {}
): Promise<BoardPost[]> {
  const now = Date.now();
  const { includeExpiredMemberPosts = false } = options;

  // A business post disappears with its business. A public post disappears
  // when it expires, which is checked here as well as by the nightly job, so
  // an expired post is invisible from the moment it expires rather than from
  // the next time the job runs -- that part is unchanged. A business post
  // past its own expiry is different: it comes off this list (browse, area,
  // category, "more from this business") but the permalink caller below
  // asks to keep it, marked expired, because staying indexed is the entire
  // point of job 7.
  const visible = rows.filter((row) => {
    const expired = Boolean(row.expires_at && new Date(row.expires_at).getTime() < now);
    if (expired && row.author_kind === "public") return false;
    if (expired && row.author_kind === "member" && !includeExpiredMemberPosts) return false;
    if (row.author_kind === "member") return Boolean(row.growth_client_id && members.has(row.growth_client_id));
    return Boolean(row.identity_id);
  });

  const [active, names] = await Promise.all([
    activeThisWeekIds([...new Set(visible.map((r) => r.growth_client_id).filter((id): id is string => Boolean(id)))]),
    resolvePersonNames(visible.map((r) => r.identity_id).filter((id): id is string => Boolean(id))),
  ]);

  return visible.map((row) => {
    const member = row.growth_client_id ? members.get(row.growth_client_id) ?? null : null;
    const personName = row.identity_id ? names.get(row.identity_id) ?? "Someone" : null;

    return {
      id: row.id,
      slug: row.slug,
      kind: row.kind,
      title: row.title,
      body: row.body,
      priceCents: row.price_cents,
      photoUrl: boardPhotoUrl(row.photo_path),
      publishedAt: row.published_at,
      member,
      personName,
      authorName: member?.businessName ?? personName ?? "Someone",
      city: member?.city ?? row.city,
      activeThisWeek: member ? active.has(member.id) : false,
      isExpired: Boolean(row.expires_at && new Date(row.expires_at).getTime() < now),
    };
  });
}

async function resolvePersonNames(identityIds: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (identityIds.length === 0) return names;

  const admin = createAdminClient();
  const { data } = await admin.from("board_identities").select("id, display_name").in("id", [...new Set(identityIds)]);
  for (const row of data ?? []) names.set(row.id, row.display_name);
  return names;
}

export type BoardFilter = {
  /** Area slug, e.g. "boksburg". Matched against the post's resolved area. */
  area?: string;
  /** Board category slug. Business posts only, since a person has no trade. */
  category?: string;
  kind?: PostKind | null;
  /** Free text across the title, the body and the author. */
  search?: string;
  limit?: number;
};

/**
 * The board itself, and every area, category, kind and search view of it.
 *
 * Ordering is published_at descending and nothing else, ever. There is no
 * engagement column in the schema to rank on even if somebody tried.
 */
export async function listPosts(filter: BoardFilter = {}): Promise<BoardPost[]> {
  const { area, category, kind, search, limit = 60 } = filter;
  const members = await listableMembers();

  const admin = createAdminClient();
  let query = admin
    .from("board_posts")
    .select(POST_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    // Fetched wide, because area, category and search are resolved after
    // the fact against the author, and applying the real limit first would
    // silently return a short page.
    .limit(Math.max(limit * 4, 200));

  if (kind) query = query.eq("kind", kind);

  if (search?.trim()) {
    const term = search.trim().replace(/[%,]/g, "");
    query = query.or(`title.ilike.%${term}%,body.ilike.%${term}%`);
  }

  const { data } = await query;
  let posts = await decorate((data ?? []) as PostRow[], members);

  if (area) posts = posts.filter((post) => post.city && areaSlug(post.city) === area);

  if (category) {
    const resolved = categoryFromSlug(category);
    if (!resolved) return [];
    posts = posts.filter(
      (post) => post.member?.industry && resolved.subcategories.includes(post.member.industry)
    );
  }

  return posts.slice(0, limit);
}

/** One post for its own page. Null when it is not publicly listable. */
export async function getPostBySlug(slug: string): Promise<BoardPost | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("board_posts")
    .select(POST_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!data) return null;

  const members = await listableMembers();
  // Job 7: the permalink keeps resolving a business post past its expiry,
  // marked expired, since staying reachable and indexed is the point.
  const decorated = await decorate([data as PostRow], members, { includeExpiredMemberPosts: true });
  return decorated[0] ?? null;
}

/** Other posts by the same business, for the bottom of a post page. */
export async function listPostsByMember(memberId: string, excludePostId: string, limit = 3): Promise<BoardPost[]> {
  const members = await listableMembers();
  if (!members.has(memberId)) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("board_posts")
    .select(POST_COLUMNS)
    .eq("status", "published")
    .eq("growth_client_id", memberId)
    .neq("id", excludePostId)
    .order("published_at", { ascending: false })
    .limit(limit);

  return decorate((data ?? []) as PostRow[], members);
}

export type BoardArea = { slug: string; name: string; count: number };

/**
 * The areas that exist, with how many businesses are in each.
 *
 * Built from what members actually say their city is, not from the CITIES
 * dropdown, because the dropdown has a free-text escape hatch and members
 * have used it.
 */
export async function listAreas(): Promise<BoardArea[]> {
  const members = await listableMembers();
  return buildAreas([...members.values()].map((m) => m.city));
}

/** Resolves an area slug to its display name, or null when nobody is there. */
export async function findArea(slug: string): Promise<BoardArea | null> {
  const areas = await listAreas();
  return areas.find((a) => a.slug === slug) ?? null;
}

/**
 * Post slugs for the sitemap.
 *
 * Business posts only. A person's want-ad is real content for a person and
 * thin content for Google, and filling the index with classifieds would
 * cost the domain the standing the business posts are there to build.
 */
export async function listPostSlugsForSitemap(): Promise<{ slug: string; publishedAt: string }[]> {
  const posts = await listPosts({ limit: 500 });
  return posts.filter((p) => p.member).map((p) => ({ slug: p.slug, publishedAt: p.publishedAt }));
}
