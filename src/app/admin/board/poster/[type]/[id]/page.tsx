import type { Metadata } from "next";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { kindLabel } from "@/lib/board/kinds";

// Job 6: "A poster's history is visible to admin from any post in one
// click. Volume and pattern catch what any single post does not."
//
// Every post and every comment by this poster, any status, in one list.
// posted_by_client_id (added for this handoff) is what makes a member's
// history findable regardless of whether they posted as their business or
// as themselves -- growth_client_id alone would miss the "as myself" rows.
// Older posts written before that column existed only show up here by
// growth_client_id, which is the one gap this page cannot close on its own.

export const metadata: Metadata = { robots: { index: false, follow: false } };

type PosterType = "member" | "identity";

export default async function PosterHistoryPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) forbidden();

  const { type, id } = await params;
  if (type !== "member" && type !== "identity") notFound();
  const posterType = type as PosterType;

  const admin = createAdminClient();

  const [{ data: label }, { data: posts }, { data: comments }] = await Promise.all([
    posterType === "member"
      ? admin.from("growth_clients").select("business_name").eq("id", id).maybeSingle()
      : admin.from("board_identities").select("display_name, email, blocked_at").eq("id", id).maybeSingle(),
    posterType === "member"
      ? admin
          .from("board_posts")
          .select("id, slug, title, kind, status, created_at")
          .or(`posted_by_client_id.eq.${id},growth_client_id.eq.${id}`)
          .order("created_at", { ascending: false })
      : admin
          .from("board_posts")
          .select("id, slug, title, kind, status, created_at")
          .eq("identity_id", id)
          .order("created_at", { ascending: false }),
    posterType === "member"
      ? admin
          .from("board_comments")
          .select("id, body, status, created_at, board_posts!inner(slug, title)")
          .eq("growth_client_id", id)
          .order("created_at", { ascending: false })
      : admin
          .from("board_comments")
          .select("id, body, status, created_at, board_posts!inner(slug, title)")
          .eq("identity_id", id)
          .order("created_at", { ascending: false }),
  ]);

  if (!label) notFound();

  const name =
    posterType === "member"
      ? (label as { business_name: string }).business_name
      : (label as { display_name: string }).display_name;

  const postRows = (posts ?? []) as { id: string; slug: string; title: string; kind: string; status: string; created_at: string }[];
  const commentRows = (comments ?? []) as unknown as {
    id: string;
    body: string;
    status: string;
    created_at: string;
    board_posts: { slug: string; title: string };
  }[];

  return (
    <main className="min-h-full bg-gray-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <BrandHeader />

        <div className="flex items-center gap-3">
          <Link href="/admin/board" className="text-sm font-semibold text-gray-500 hover:text-gray-700">
            ← The Board
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{name}</h1>
        </div>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-ink">Posts ({postRows.length})</h2>
          {postRows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              Nothing yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="border-b border-gray-100 text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">When</th>
                    <th className="px-3 py-2 font-semibold">Kind</th>
                    <th className="px-3 py-2 font-semibold">Title</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {postRows.map((post) => (
                    <tr key={post.id} className="border-b border-gray-50 last:border-0">
                      <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                        {new Date(post.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{kindLabel(post.kind)}</td>
                      <td className="px-3 py-2 font-semibold text-ink">
                        <Link href={`/board/post/${post.slug}`} target="_blank" className="hover:text-brand hover:underline">
                          {post.title}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-gray-500">{post.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-ink">Comments ({commentRows.length})</h2>
          {commentRows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              Nothing yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {commentRows.map((comment) => (
                <li key={comment.id} className="rounded-2xl border border-gray-100 bg-white p-3 text-sm shadow-sm">
                  <p className="text-xs text-gray-400">
                    On {comment.board_posts.title} ·{" "}
                    {new Date(comment.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })} ·{" "}
                    {comment.status}
                  </p>
                  <p className="mt-1 text-gray-700">{comment.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
