import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  restoreComment,
  removeComment,
  hidePost,
  dismissPostReports,
  restoreHeldPost,
  dismissJobsReport,
  unlistJobsCandidate,
  restoreHeldVacancy,
  removeHeldVacancy,
  dismissVacancyReport,
  takeDownReportedVacancy,
} from "@/app/admin/board/actions";
import { blockFromForm, unblockIdentity } from "@/app/admin/board/block-actions";
import { daysAgoIso } from "@/lib/jobs/entitlements";
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

  const [
    { data: heldComments },
    { data: heldPosts },
    { data: postReports },
    { data: log },
    { data: rules },
    { data: jobsReports },
    { data: heldVacancies },
    { data: vacancyReports },
    { data: recentViews },
  ] = await Promise.all([
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
    admin
      .from("jobs_reports")
      .select("id, target_id, reason, created_at")
      .eq("target_type", "candidate")
      .eq("status", "open")
      .order("created_at", { ascending: true }),
    admin
      .from("jobs_vacancies")
      .select("id, title, held_reason, created_at, jobs_employers!inner(business_name, email)")
      .eq("status", "held")
      .order("created_at", { ascending: true }),
    admin
      .from("jobs_reports")
      .select("id, target_id, reason, created_at")
      .eq("target_type", "vacancy")
      .eq("status", "open")
      .order("created_at", { ascending: true }),
    // The scraping watchlist's raw material: a week of full-record views,
    // aggregated below. Capped generously; if this ever tops out, that IS
    // the signal the page exists to catch.
    admin
      .from("jobs_record_views")
      .select("employer_id, jobs_employers!inner(business_name, email)")
      .gte("created_at", daysAgoIso(7))
      .limit(5000),
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

  // Same one-query-not-N pattern as the post reports above. Full name is
  // shown here even though the public browse layer never carries one --
  // this is the admin's own gated page, and investigating a report
  // properly needs to know who the listing actually is.
  const jobsReportedIds = [...new Set((jobsReports ?? []).map((r) => r.target_id))];
  const { data: reportedCandidates } = jobsReportedIds.length
    ? await admin
        .from("jobs_candidates")
        .select("id, full_name, suburb, years_experience, listed, jobs_taxonomy!jobs_candidates_primary_role_id_fkey(label)")
        .in("id", jobsReportedIds)
    : { data: [] as { id: string; full_name: string | null; suburb: string | null; years_experience: number | null; listed: boolean; jobs_taxonomy: { label: string } | null }[] };
  const candidateById = new Map((reportedCandidates ?? []).map((c) => [c.id, c]));

  // Reported vacancies, one query for the lot (the post-reports pattern).
  const reportedVacancyIds = [...new Set((vacancyReports ?? []).map((r) => r.target_id))];
  const { data: reportedVacancies } = reportedVacancyIds.length
    ? await admin
        .from("jobs_vacancies")
        .select("id, title, status, jobs_employers!inner(business_name)")
        .in("id", reportedVacancyIds)
    : { data: [] as { id: string; title: string; status: string; jobs_employers: { business_name: string } }[] };
  const vacancyById = new Map((reportedVacancies ?? []).map((v) => [v.id, v]));

  // The scraping watchlist: full-record views per employer, last 7 days,
  // heaviest first. The number itself is the judgement call, so the list
  // just shows it; killing an account stays a deliberate act.
  const viewCounts = new Map<string, { name: string; email: string; count: number }>();
  for (const view of recentViews ?? []) {
    const emp = view.jobs_employers as unknown as { business_name: string; email: string };
    const existing = viewCounts.get(view.employer_id);
    if (existing) existing.count++;
    else viewCounts.set(view.employer_id, { name: emp.business_name, email: emp.email, count: 1 });
  }
  const topViewers = [...viewCounts.values()].sort((a, b) => b.count - a.count).slice(0, 10);

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
          <StatusPill>
            {held.length +
              heldPostRows.length +
              (postReports?.length ?? 0) +
              (jobsReports?.length ?? 0) +
              (heldVacancies?.length ?? 0) +
              (vacancyReports?.length ?? 0)}{" "}
            waiting
          </StatusPill>
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

        {/* KatisoBiz Jobs, Sprint 1: a new, parallel queue rather than a
            widened Board section -- jobs_reports is its own table (see the
            migration's own reasoning), so this is the one extra section
            this sprint adds to the same admin page rather than a second
            admin screen to remember to check. */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-ink">Reported jobs listings</h2>
          {(jobsReports?.length ?? 0) === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              Nothing reported.
            </p>
          ) : (
            (jobsReports ?? []).map((report) => {
              const candidate = candidateById.get(report.target_id);
              const roleLabel = (candidate?.jobs_taxonomy as unknown as { label: string } | null)?.label;
              return (
                <div key={report.id} className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-ink">
                    {candidate ? `${candidate.full_name ?? "Unnamed"}, ${roleLabel ?? "no role set"}` : "Listing no longer available"}
                  </p>
                  {candidate && (
                    <p className="text-xs text-gray-500">
                      {[candidate.suburb, candidate.years_experience != null ? `${candidate.years_experience} years` : null]
                        .filter(Boolean)
                        .join(", ")}
                      {!candidate.listed && " · already unlisted"}
                    </p>
                  )}
                  {report.reason && <p className="text-sm text-gray-600">Reason given: {report.reason}</p>}
                  <div className="flex flex-wrap gap-2">
                    <form action={dismissJobsReport.bind(null, report.id, report.target_id)}>
                      <button
                        type="submit"
                        className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:border-emerald-300 hover:text-emerald-700"
                      >
                        Leave it up
                      </button>
                    </form>
                    <form action={unlistJobsCandidate.bind(null, report.id, report.target_id)}>
                      <button
                        type="submit"
                        className="rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                      >
                        Unlist it
                      </button>
                    </form>
                    {candidate && (
                      <Link
                        href={`https://jobs.katisobiz.co.za/find-people/${candidate.id}`}
                        target="_blank"
                        className="self-center text-xs font-semibold text-gray-400 underline-offset-2 hover:text-brand hover:underline"
                      >
                        See it
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>

        {/* Sprint 2: held vacancies -- the advance-fee auto-hold's queue. */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-ink">Job posts held for review</h2>
          <p className="text-xs text-gray-500">
            Held because the wording asked candidates for money, or looked like it did. Never auto-removed,
            always a person&apos;s call.
          </p>
          {(heldVacancies?.length ?? 0) === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              Nothing waiting.
            </p>
          ) : (
            (heldVacancies ?? []).map((v) => {
              const emp = v.jobs_employers as unknown as { business_name: string; email: string };
              return (
                <div key={v.id} className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">{v.title}</p>
                    <span className="text-xs text-gray-400">
                      {new Date(v.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    By {emp.business_name} <span className="text-gray-400">{emp.email}</span>
                  </p>
                  {v.held_reason && <p className="text-xs font-semibold text-amber-700">Held because: {v.held_reason}</p>}
                  <div className="flex flex-wrap gap-2">
                    <form action={restoreHeldVacancy.bind(null, v.id)}>
                      <button
                        type="submit"
                        className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:border-emerald-300 hover:text-emerald-700"
                      >
                        Approve and publish
                      </button>
                    </form>
                    <form action={removeHeldVacancy.bind(null, v.id)}>
                      <button
                        type="submit"
                        className="rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                      >
                        Remove it
                      </button>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-ink">Reported job posts</h2>
          {(vacancyReports?.length ?? 0) === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              Nothing reported.
            </p>
          ) : (
            (vacancyReports ?? []).map((report) => {
              const vacancy = vacancyById.get(report.target_id);
              const emp = vacancy?.jobs_employers as unknown as { business_name: string } | undefined;
              return (
                <div key={report.id} className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-ink">
                    {vacancy ? `${vacancy.title}, by ${emp?.business_name}` : "Post no longer available"}
                    {vacancy && vacancy.status !== "published" && " · already down"}
                  </p>
                  {report.reason && <p className="text-sm text-gray-600">Reason given: {report.reason}</p>}
                  <div className="flex flex-wrap gap-2">
                    <form action={dismissVacancyReport.bind(null, report.id, report.target_id)}>
                      <button
                        type="submit"
                        className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:border-emerald-300 hover:text-emerald-700"
                      >
                        Leave it up
                      </button>
                    </form>
                    <form action={takeDownReportedVacancy.bind(null, report.id, report.target_id)}>
                      <button
                        type="submit"
                        className="rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                      >
                        Take it down
                      </button>
                    </form>
                    {vacancy && (
                      <Link
                        href={`https://jobs.katisobiz.co.za/vacancies/${vacancy.id}`}
                        target="_blank"
                        className="self-center text-xs font-semibold text-gray-400 underline-offset-2 hover:text-brand hover:underline"
                      >
                        See it
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>

        {/* The anti-scraping watchlist: who pulled how many full candidate
            records this week. The spec's own words: you will not stop the
            first scrape, you will see the account that pulled 400 records
            in an hour and kill it. Killing one stays a deliberate act done
            by hand, not a button pressed in passing. */}
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-ink">Candidate record views, last 7 days</h2>
          {topViewers.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              No full-record views yet.
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              {topViewers.map((viewer) => (
                <div key={viewer.email} className="flex items-center justify-between gap-3 border-b border-gray-50 px-4 py-3 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-ink">{viewer.name}</p>
                    <p className="text-xs text-gray-500">{viewer.email}</p>
                  </div>
                  <span className={`text-sm font-bold ${viewer.count > 200 ? "text-red-600" : "text-gray-700"}`}>
                    {viewer.count} views
                  </span>
                </div>
              ))}
            </div>
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
