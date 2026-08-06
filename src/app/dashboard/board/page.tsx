import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, ExternalLink, Eye, EyeOff } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PostComposer } from "@/components/board/PostComposer";
import { createBoardPost } from "@/app/board/new/actions";
import { MEMBER_KINDS } from "@/lib/board/kinds";
import { BoardCommentRow } from "@/components/dashboard/BoardCommentRow";
import { hideBoardPost, republishBoardPost, renewBoardPost } from "@/app/dashboard/board/actions";
import { boardPhotoUrl } from "@/lib/board/queries";
import { boardPrice, postedWhen } from "@/lib/board/format";
import { kindLabel } from "@/lib/board/kinds";

// Private, signed-in-only, same as the rest of the dashboard.
export const metadata: Metadata = { robots: { index: false, follow: false } };

type MyPost = {
  id: string;
  slug: string;
  kind: string;
  title: string;
  price_cents: number | null;
  photo_path: string | null;
  status: string;
  published_at: string;
  expires_at: string | null;
};

const RENEW_WINDOW_DAYS = 7;

export default async function DashboardBoardPage() {
  const client = await requireGrowthClientId();

  if (client.error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
        <BrandHeader />
        <div className="flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-ink">Please log in</h1>
          <p className="text-sm text-gray-500">This page needs you to be signed in.</p>
          <Link href="/login" className="text-sm font-semibold text-brand underline-offset-2 hover:underline">
            Log in
          </Link>
        </div>
        <SiteFooter />
      </main>
    );
  }

  const admin = createAdminClient();
  const [{ data: growthClient }, { data: posts }, { data: comments }] = await Promise.all([
    admin.from("growth_clients").select("city, business_name").eq("id", client.id).single(),
    admin
      .from("board_posts")
      .select("id, slug, kind, title, price_cents, photo_path, status, published_at, expires_at")
      // A removed post is a moderation outcome, not something the member
      // manages here, so it is not in this list at all. Phase 2 owns that
      // conversation and will need its own place to have it.
      .in("status", ["published", "hidden"])
      .eq("growth_client_id", client.id)
      .order("published_at", { ascending: false }),
    // Comments on this member's own posts. Held ones are shown too, so a
    // member who takes something down can see that it actually went, rather
    // than wondering whether the button worked.
    admin
      .from("board_comments")
      .select("id, body, created_at, status, board_identities!inner(display_name), board_posts!inner(slug, title, growth_client_id)")
      .eq("board_posts.growth_client_id", client.id)
      .in("status", ["published", "held"])
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  // One timestamp for the whole render, rather than a fresh Date.now() per
  // row. react-hooks/purity flags Date.now() as an impure render call, a
  // rule aimed at client components that may re-render from cached props
  // with no new data -- this is an async Server Component that re-executes
  // fully per request by definition, so there's no stale-render risk here
  // (same reasoning as dashboard/page.tsx's own use of Date.now()).
  // eslint-disable-next-line react-hooks/purity
  const requestTime = Date.now();

  const myPosts = (posts ?? []) as MyPost[];
  const myComments = (comments ?? []) as unknown as {
    id: string;
    body: string;
    created_at: string;
    status: string;
    board_identities: { display_name: string };
    board_posts: { slug: string; title: string };
  }[];

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <BrandHeader />

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 transition-colors hover:text-brand"
        >
          <ChevronLeft size={14} /> Dashboard
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">The Board</h1>
            <p className="mt-1 text-sm text-gray-500">
              Post what you are offering. People browsing your area see it, every time, with no boosting and nothing to
              pay.
            </p>
          </div>
          <Link
            href="/board"
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 transition-colors hover:border-brand/40 hover:text-brand"
          >
            <ExternalLink size={13} /> See the board
          </Link>
        </div>

        <div className="mt-6">
          <PostComposer
            kinds={MEMBER_KINDS}
            action={createBoardPost}
            businessName={growthClient?.business_name ?? null}
            savedCity={growthClient?.city ?? null}
            needsIdentity={false}
            backHref="/dashboard/board"
          />
        </div>

        <div className="mt-8">
          <h2 className="mb-3 text-sm font-bold text-ink">Your posts</h2>

          {myPosts.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
              Nothing posted yet. The first one takes about a minute.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {myPosts.map((post) => {
                const price = boardPrice(post.price_cents);
                const photoUrl = boardPhotoUrl(post.photo_path);
                const hidden = post.status === "hidden";
                const msUntilExpiry = post.expires_at ? new Date(post.expires_at).getTime() - requestTime : null;
                const nearingExpiry = msUntilExpiry !== null && msUntilExpiry < RENEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
                const expired = msUntilExpiry !== null && msUntilExpiry < 0;

                return (
                  <li
                    key={post.id}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:flex-nowrap"
                  >
                    <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                      {photoUrl && (
                        <Image src={photoUrl} alt="" width={56} height={56} className="size-full object-cover" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{post.title}</p>
                      <p className="truncate text-xs text-gray-500">
                        {kindLabel(post.kind)}
                        {price ? ` · ${price}` : ""} · {postedWhen(post.published_at)}
                        {hidden ? " · not public" : ""}
                        {expired ? " · expired" : nearingExpiry ? " · expiring soon" : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!hidden && nearingExpiry && (
                        <form action={renewBoardPost.bind(null, post.id)}>
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:border-emerald-300"
                          >
                            Renew
                          </button>
                        </form>
                      )}
                      {!hidden && (
                        <Link
                          href={`/board/post/${post.slug}`}
                          className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 transition-colors hover:border-brand/40 hover:text-brand"
                          aria-label="View the post"
                        >
                          <ExternalLink size={15} />
                        </Link>
                      )}
                      {/* Bound server actions in plain forms, so taking a post
                          down works with no client JavaScript at all. */}
                      {hidden ? (
                        <form action={republishBoardPost.bind(null, post.id)}>
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:border-brand/40 hover:text-brand"
                          >
                            <Eye size={14} /> Put it back
                          </button>
                        </form>
                      ) : (
                        <form action={hideBoardPost.bind(null, post.id)}>
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:border-red-300 hover:text-red-600"
                          >
                            <EyeOff size={14} /> Take it down
                          </button>
                        </form>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Phase 2. Only appears once somebody has actually said something,
            because an empty "Comments" heading on every dashboard teaches a
            member that nobody comments. */}
        {myComments.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-1 text-sm font-bold text-ink">Comments on your posts</h2>
            <p className="mb-3 text-sm text-gray-500">
              Someone asking what it costs is a job waiting to be quoted. One tap turns it into a real quote in
              KatisoBiz.
            </p>
            <ul className="flex flex-col gap-3">
              {myComments.map((comment) => (
                <BoardCommentRow
                  key={comment.id}
                  commentId={comment.id}
                  postTitle={comment.board_posts.title}
                  postSlug={comment.board_posts.slug}
                  authorName={comment.board_identities.display_name}
                  body={comment.body}
                  createdAt={comment.created_at}
                  status={comment.status}
                />
              ))}
            </ul>
          </div>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
