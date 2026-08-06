import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { restoreComment, removeComment, hidePost, dismissPostReports, restoreHeldPost } from "@/app/admin/board/actions";
import { blockFromForm, unblockIdentity } from "@/app/admin/board/block-actions";
import { toggleRuleFromForm } from "@/app/admin/board/rule-actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// The Board, Phase 2 moderation queue.
//
// Two lists and a log. Held comments are things a rule took out of public
// view and could not decide about. Reported posts are things only a person
// can judge. The log underneath is every decision anything has ever made,
// automatic ones included, which is the part that answers "why did this
// disappear" three weeks later.
type HeldComment = {
  id: string;
  body: string;
  held_reason: string | null;
  created_at: string;
  board_identities: { id: string; display_name: string; email: string | null; blocked_at: string | null };
  board_posts: { slug: string; title: string; growth_clients: { business_name: string } };
};

type HeldPost = {
  id: string;
  slug: string;
  title: string;
  held_reason: string | null;
  created_at: string;
  growth_client_id: string | null;
  identity_id: string | null;
  growth_clients: { business_name: string } | null;
  board_identities: { display_name: string } | null;
};

type RuleRow = { rule_key: string; category: "auto" | "hold"; label: string; description: string; enabled: boolean };

function posterHistoryHref(row: { growth_client_id: string | null; identity_id: string | null }): string | null {
  if (row.growth_client_id) return `/admin/board/poster/member/${row.growth_client_id}`;
  if (row.identity_id) return `/admin/board/poster/identity/${row.identity_id}`;
  return null;
}

export default async function AdminBoardPage() {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) forbidden();

  const admin = createAdminClient();

  const [{ data: heldComments }, { data: heldPosts }, { data: postReports }, { data: log }, { data: rules }] = await Promise.all([
    admin
      .from("board_comments")
      .select(
        "id, body, held_reason, created_at, board_identities!inner(id, display_name, email, blocked_at), board_posts!inner(slug, title, growth_clients!inner(business_name))"
      )
      .eq("status", "held")
      .order("created_at", { ascending: true }),
    admin
      .from("board_posts")
      .select("id, slug, title, held_reason, created_at, growth_client_id, identity_id, growth_clients(business_name), board_identities(display_name)")
      .eq("status", "held")
      .order("created_at", { ascending: true }),
    admin
      .from("board_reports")
      .select("id, target_id, reason, created_at")
      .eq("target_type", "post")
      .eq("status", "open")
      .order("created_at", { ascending: true }),
    admin
      .from("board_moderation_log")
      .select("id, target_type, target_id, action, rule, actor, note, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
    admin.from("board_moderation_rules").select("rule_key, category, label, description, enabled").order("category").order("rule_key"),
  ]);

  const held = (heldComments ?? []) as unknown as HeldComment[];
  const heldPostRows = (heldPosts ?? []) as unknown as HeldPost[];
  const ruleRows = (rules ?? []) as RuleRow[];

  // One query for the posts behind the open reports, rather than one per row.
  const reportedPostIds = [...new Set((postReports ?? []).map((r) => r.target_id))];
  const { data: reportedPosts } = reportedPostIds.length
    ? await admin
        .from("board_posts")
        .select("id, slug, title, status, growth_client_id, identity_id")
        .in("id", reportedPostIds)
    : { data: [] as { id: string; slug: string; title: string; status: string; growth_client_id: string | null; identity_id: string | null }[] };
  const postById = new Map((reportedPosts ?? []).map((p) => [p.id, p]));

  return (
    <main className="min-h-full bg-gray-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <BrandHeader />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm font-semibold text-gray-500 hover:text-gray-700">
              ← Admin
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-ink">The Board</h1>
          </div>
          <StatusPill>{held.length + heldPostRows.length + (postReports?.length ?? 0)} waiting</StatusPill>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-ink">Comments out of public view</h2>
          {held.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              Nothing waiting.
            </p>
          ) : (
            held.map((comment) => (
              <div key={comment.id} className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">
                    {comment.board_identities.display_name}
                    <span className="ml-2 font-normal text-gray-400">{comment.board_identities.email}</span>
                  </p>
                  <span className="text-xs text-gray-400">
                    {new Date(comment.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  On <span className="font-semibold">{comment.board_posts.title}</span> by{" "}
                  {comment.board_posts.growth_clients.business_name}
                </p>
                <p className="whitespace-pre-line rounded-xl bg-gray-50 p-3 text-sm leading-relaxed text-gray-700">
                  {comment.body}
                </p>
                {comment.held_reason && (
                  <p className="text-xs font-semibold text-amber-700">Held because: {comment.held_reason}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <form action={restoreComment.bind(null, comment.id)}>
                    <button
                      type="submit"
                      className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:border-emerald-300 hover:text-emerald-700"
                    >
                      Put it back
                    </button>
                  </form>
                  <form action={removeComment.bind(null, comment.id)}>
                    <button
                      type="submit"
                      className="rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                    >
                      Remove it
                    </button>
                  </form>
                  <Link
                    href={`/board/post/${comment.board_posts.slug}`}
                    target="_blank"
                    className="self-center text-xs font-semibold text-gray-400 underline-offset-2 hover:text-brand hover:underline"
                  >
                    See the post
                  </Link>
                  <Link
                    href={`/admin/board/poster/identity/${comment.board_identities.id}`}
                    className="self-center text-xs font-semibold text-gray-400 underline-offset-2 hover:text-brand hover:underline"
                  >
                    See their history
                  </Link>
                </div>

                {/* Blocking the person rather than the message. A report
                    deals with one comment, this deals with whoever keeps
                    writing them. */}
                <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2">
                  {comment.board_identities.blocked_at ? (
                    <form action={unblockIdentity.bind(null, comment.board_identities.id)}>
                      <button
                        type="submit"
                        className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 transition hover:border-gray-300"
                      >
                        Blocked, undo
                      </button>
                    </form>
                  ) : (
                    <form
                      action={blockFromForm.bind(null, comment.board_identities.id)}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <input
                        type="text"
                        name="reason"
                        placeholder="Why, for the record"
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-brand"
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50"
                      >
                        Block this person
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-ink">Posts out of public view</h2>
          <p className="text-xs text-gray-500">
            A rule held these -- payment details, suspected scam wording, or a health/income claim. Never auto-removed,
            always a person&apos;s call.
          </p>
          {heldPostRows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              Nothing waiting.
            </p>
          ) : (
            heldPostRows.map((post) => {
              const historyHref = posterHistoryHref(post);
              const posterName = post.growth_clients?.business_name ?? post.board_identities?.display_name ?? "Someone";
              return (
                <div key={post.id} className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">{post.title}</p>
                    <span className="text-xs text-gray-400">
                      {new Date(post.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">By {posterName}</p>
                  {post.held_reason && (
                    <p className="text-xs font-semibold text-amber-700">Held because: {post.held_reason}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <form action={restoreHeldPost.bind(null, post.id)}>
                      <button
                        type="submit"
                        className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:border-emerald-300 hover:text-emerald-700"
                      >
                        Put it back
                      </button>
                    </form>
                    <form action={hidePost.bind(null, post.id)}>
                      <button
                        type="submit"
                        className="rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                      >
                        Remove it
                      </button>
                    </form>
                    <Link
                      href={`/board/post/${post.slug}`}
                      target="_blank"
                      className="self-center text-xs font-semibold text-gray-400 underline-offset-2 hover:text-brand hover:underline"
                    >
                      See it
                    </Link>
                    {historyHref && (
                      <Link
                        href={historyHref}
                        className="self-center text-xs font-semibold text-gray-400 underline-offset-2 hover:text-brand hover:underline"
                      >
                        See their history
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-ink">Reported posts</h2>
          {(postReports?.length ?? 0) === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              Nothing reported.
            </p>
          ) : (
            (postReports ?? []).map((report) => {
              const post = postById.get(report.target_id);
              const historyHref = post ? posterHistoryHref(post) : null;
              return (
                <div key={report.id} className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-ink">{post?.title ?? "Post no longer available"}</p>
                  {report.reason && <p className="text-sm text-gray-600">Reason given: {report.reason}</p>}
                  <div className="flex flex-wrap gap-2">
                    <form action={dismissPostReports.bind(null, report.target_id)}>
                      <button
                        type="submit"
                        className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:border-emerald-300 hover:text-emerald-700"
                      >
                        Leave it up
                      </button>
                    </form>
                    <form action={hidePost.bind(null, report.target_id)}>
                      <button
                        type="submit"
                        className="rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                      >
                        Take the post down
                      </button>
                    </form>
                    {post && (
                      <Link
                        href={`/board/post/${post.slug}`}
                        target="_blank"
                        className="self-center text-xs font-semibold text-gray-400 underline-offset-2 hover:text-brand hover:underline"
                      >
                        See it
                      </Link>
                    )}
                    {historyHref && (
                      <Link
                        href={historyHref}
                        className="self-center text-xs font-semibold text-gray-400 underline-offset-2 hover:text-brand hover:underline"
                      >
                        See their history
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-ink">Rules</h2>
          <p className="text-xs text-gray-500">
            What the bot enforces on its own. Required fields and who may post what are not here -- those stay on,
            always.
          </p>
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {(["auto", "hold"] as const).map((category) => (
              <div key={category}>
                <p className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                  {category === "auto" ? "Auto-enforced, rejects at submission" : "Flag and hold, a person decides"}
                </p>
                {ruleRows
                  .filter((rule) => rule.category === category)
                  .map((rule) => (
                    <div
                      key={rule.rule_key}
                      className="flex items-center justify-between gap-3 border-b border-gray-50 px-4 py-3 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-semibold text-ink">{rule.label}</p>
                        <p className="text-xs text-gray-500">{rule.description}</p>
                      </div>
                      <form action={toggleRuleFromForm.bind(null, rule.rule_key, rule.enabled)}>
                        <button
                          type="submit"
                          className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                            rule.enabled
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {rule.enabled ? "On" : "Off"}
                        </button>
                      </form>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-ink">Decision log</h2>
          <p className="text-xs text-gray-500">
            Every decision, including the automatic ones. Append only, nothing in the app can rewrite it.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="border-b border-gray-100 text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">When</th>
                  <th className="px-3 py-2 font-semibold">What</th>
                  <th className="px-3 py-2 font-semibold">Rule</th>
                  <th className="px-3 py-2 font-semibold">Who</th>
                </tr>
              </thead>
              <tbody>
                {(log ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-gray-400">
                      Nothing yet.
                    </td>
                  </tr>
                ) : (
                  (log ?? []).map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-50 last:border-0">
                      <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                        {new Date(entry.created_at).toLocaleString("en-ZA", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-2 font-semibold text-ink">
                        {entry.action} {entry.target_type}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{entry.rule}</td>
                      <td className="px-3 py-2 text-gray-500">{entry.actor}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
