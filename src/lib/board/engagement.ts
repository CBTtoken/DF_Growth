import { createAdminClient } from "@/lib/supabase/admin";
import { currentVisitor } from "@/lib/board/visitor";

// Reads for the Phase 2 half of the board: who the visitor is, if anyone,
// and what is on a post.

export type BoardIdentity = {
  id: string;
  displayName: string;
  email: string;
  quoteConsent: boolean;
};

export type BoardComment = {
  id: string;
  body: string;
  authorName: string;
  /** True when the business whose post this is wrote it. Shown as a badge. */
  fromBusiness: boolean;
  createdAt: string;
  replies: BoardComment[];
};

/**
 * The person on this device, or null.
 *
 * Now a signed cookie rather than a Supabase session, see lib/board/visitor.
 * Null is the normal case and is never an error: browsing, reading and
 * sharing are all ungated, and this only has to resolve for somebody who
 * has already left a comment or a message on this device before.
 */
export async function currentBoardIdentity(): Promise<BoardIdentity | null> {
  const visitor = await currentVisitor();
  if (!visitor) return null;
  return {
    id: visitor.id,
    displayName: visitor.displayName,
    email: visitor.email ?? "",
    quoteConsent: visitor.quoteConsent,
  };
}

/**
 * Published comments on a post, oldest first, with their replies nested
 * under them.
 *
 * One level deep, which is what Facebook does and what people can read.
 * A reply to a reply attaches to the same parent rather than starting a
 * third level.
 *
 * The join is a left join on both possible authors, because a comment now
 * comes either from a member of the public or from the business whose post
 * it is, and exactly one of those is set.
 */
export async function listComments(postId: string): Promise<BoardComment[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("board_comments")
    .select(
      "id, body, created_at, parent_comment_id, board_identities(display_name), growth_clients(business_name)"
    )
    .eq("post_id", postId)
    .eq("status", "published")
    .order("created_at", { ascending: true });

  type Row = {
    id: string;
    body: string;
    created_at: string;
    parent_comment_id: string | null;
    board_identities: { display_name: string } | null;
    growth_clients: { business_name: string } | null;
  };

  const rows = (data ?? []) as unknown as Row[];

  const toComment = (row: Row): BoardComment => ({
    id: row.id,
    body: row.body,
    authorName: row.growth_clients?.business_name ?? row.board_identities?.display_name ?? "Someone",
    fromBusiness: Boolean(row.growth_clients),
    createdAt: row.created_at,
    replies: [],
  });

  const byId = new Map<string, BoardComment>();
  const top: BoardComment[] = [];

  for (const row of rows) {
    byId.set(row.id, toComment(row));
  }
  for (const row of rows) {
    const comment = byId.get(row.id)!;
    const parent = row.parent_comment_id ? byId.get(row.parent_comment_id) : null;
    if (parent) parent.replies.push(comment);
    else top.push(comment);
  }

  return top;
}

/**
 * Likes on a post, and whether this visitor is one of them.
 *
 * A count, not a ranking input. Nothing sorts by it, and there is no
 * counter column on board_posts precisely so that nothing can start to.
 */
export async function likeState(postId: string, identityId: string | null): Promise<{ count: number; mine: boolean }> {
  const admin = createAdminClient();
  const [{ count }, mine] = await Promise.all([
    admin.from("board_likes").select("post_id", { count: "exact", head: true }).eq("post_id", postId),
    identityId
      ? admin
          .from("board_likes")
          .select("post_id")
          .eq("post_id", postId)
          .eq("identity_id", identityId)
          .maybeSingle()
          .then((r) => Boolean(r.data))
      : Promise.resolve(false),
  ]);

  return { count: count ?? 0, mine };
}
