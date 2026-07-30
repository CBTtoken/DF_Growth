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
  createdAt: string;
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

/** Published comments on a post, oldest first, which is how a conversation reads. */
export async function listComments(postId: string): Promise<BoardComment[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("board_comments")
    .select("id, body, created_at, board_identities!inner(display_name)")
    .eq("post_id", postId)
    .eq("status", "published")
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => {
    const identity = (row as unknown as { board_identities: { display_name: string } }).board_identities;
    return {
      id: row.id,
      body: row.body,
      authorName: identity.display_name,
      createdAt: row.created_at,
    };
  });
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
