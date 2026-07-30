import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
 * The visitor's verified identity, or null.
 *
 * Null is the normal case and is never an error. The board works completely
 * without one: browsing, reading comments and sharing are all ungated, and
 * only liking and commenting need this to resolve.
 *
 * A Growth member signed into his own dashboard has an auth session but no
 * board identity, so he is null here too until he verifies as a commenter,
 * which is correct: a business owner replying to a comment on his own post
 * is doing something Phase 2 does not have, and pretending otherwise would
 * silently attribute his words to an unverified name.
 */
export async function currentBoardIdentity(): Promise<BoardIdentity | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("board_identities")
    .select("id, display_name, email, quote_consent")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    displayName: data.display_name,
    email: data.email,
    quoteConsent: data.quote_consent,
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
