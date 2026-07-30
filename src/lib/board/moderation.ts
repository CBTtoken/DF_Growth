import { createAdminClient } from "@/lib/supabase/admin";

// The Board, Phase 2 moderation (handoff section 5).
//
// "Auto-enforce anything countable, hold anything needing judgement."
//
// So this file contains exactly two kinds of thing: rules that can be
// decided by counting, which run themselves, and a hold, which is a rule
// deciding it cannot decide. Nothing here deletes anything, and nothing here
// judges the content of a comment. A held comment is out of public view and
// waiting for a person.
//
// Every transition writes to board_moderation_log with the rule, the actor
// and the outcome, including the automatic ones that never had a report
// behind them, because "why is this comment gone" is a question that gets
// asked about the automatic decisions most of all.

export type ModerationActor = { kind: "system" } | { kind: "member"; clientId: string } | { kind: "admin"; email: string };

export function actorLabel(actor: ModerationActor): string {
  switch (actor.kind) {
    case "system":
      return "system";
    case "member":
      return `member:${actor.clientId}`;
    case "admin":
      return `admin:${actor.email}`;
  }
}

export async function logModeration(entry: {
  targetType: "post" | "comment";
  targetId: string;
  action: "held" | "removed" | "restored" | "published";
  rule: string;
  actor: ModerationActor;
  note?: string;
}) {
  const admin = createAdminClient();
  await admin.from("board_moderation_log").insert({
    target_type: entry.targetType,
    target_id: entry.targetId,
    action: entry.action,
    rule: entry.rule,
    actor: actorLabel(entry.actor),
    note: entry.note ?? null,
  });
}

// A link in a comment on a board of businesses is either spam or a
// competitor, near enough always. It is also the one thing about a comment
// that can be decided by counting rather than by reading, so it is the one
// content rule that runs automatically. It holds rather than removes: a
// person still decides, they just decide after it is out of sight instead
// of before.
const URL_PATTERN = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|co\.za|net|org|io|shop|link)\b)/i;

export type AutoRule = { rule: string; reason: string } | null;

/** Runs at submission time, before a comment is ever visible. */
export function autoRuleForNewComment(body: string): AutoRule {
  if (URL_PATTERN.test(body)) {
    return {
      rule: "link in comment",
      reason: "This comment contains a link, so it is waiting to be checked before it appears.",
    };
  }
  return null;
}

/** How many separate people have to report something before it comes down on its own. */
const REPORT_THRESHOLD = 2;

/**
 * Applies the countable report rules and returns whether the comment was
 * held.
 *
 * Two rules, both countable:
 *
 * 1. The member whose post it is reports a comment on it. One report, held
 *    immediately. Section 5 asks for this in as many words, because the
 *    alternative is that he phones Dewald about it.
 * 2. Two different people report the same comment. Held, waiting for a
 *    decision.
 *
 * Anything else leaves the comment where it is and the report open for a
 * human, which is the judgement half of the split.
 *
 * An anonymous report counts for nothing here, on purpose. Reporting is
 * open to anyone, because something genuinely bad has to be reportable by
 * whoever sees it, but two clicks from nobody in particular must not be
 * able to remove a comment from a competitor's post. Only a verified
 * identity or the business itself moves this counter.
 */
export async function applyReportRules(commentId: string): Promise<{ held: boolean; rule: string | null }> {
  const admin = createAdminClient();

  const { data: reports } = await admin
    .from("board_reports")
    .select("reported_by_identity_id, reported_by_client_id")
    .eq("target_type", "comment")
    .eq("target_id", commentId)
    .eq("status", "open");

  if (!reports?.length) return { held: false, rule: null };

  const { data: comment } = await admin
    .from("board_comments")
    .select("id, status, post_id, board_posts!inner(growth_client_id)")
    .eq("id", commentId)
    .maybeSingle();

  if (!comment || comment.status !== "published") return { held: false, rule: null };

  const ownerId = (comment as unknown as { board_posts: { growth_client_id: string } }).board_posts.growth_client_id;
  const reportedByOwner = reports.some((r) => r.reported_by_client_id === ownerId);
  const distinctReporters = new Set(
    reports.map((r) => r.reported_by_identity_id ?? r.reported_by_client_id).filter(Boolean)
  ).size;

  const rule = reportedByOwner
    ? "reported by the business whose post it is"
    : distinctReporters >= REPORT_THRESHOLD
      ? `reported by ${REPORT_THRESHOLD} different people`
      : null;

  if (!rule) return { held: false, rule: null };

  await admin
    .from("board_comments")
    .update({ status: "held", held_reason: rule, updated_at: new Date().toISOString() })
    .eq("id", commentId);

  await logModeration({
    targetType: "comment",
    targetId: commentId,
    action: "held",
    rule,
    actor: reportedByOwner ? { kind: "member", clientId: ownerId } : { kind: "system" },
  });

  return { held: true, rule };
}
