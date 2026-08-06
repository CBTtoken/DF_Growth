import { createAdminClient } from "@/lib/supabase/admin";

// The Board, structural moderation (handoff scripts/handoff-board-moderation.md,
// building on Phase 2's original section 5).
//
// "Auto-enforce anything countable, hold anything needing judgement."
//
// So this file contains three kinds of thing: rules that can be decided by
// counting, which run themselves and reject at submission; holds, which are
// a rule deciding it cannot decide and needs a person; and the toggle table
// that lets an admin switch any one of them off. Nothing here deletes
// anything, and nothing here removes on judgement alone. A held post or
// comment is out of public view and waiting for a person.
//
// Every transition writes to board_moderation_log with the rule, the actor
// and the outcome, including the automatic ones that never had a report
// behind them, because "why is this gone" is a question that gets asked
// about the automatic decisions most of all.

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

// Job 4: every rule below is individually switchable in admin, sensible
// defaults on. Two things the handoff also lists under job 4 are
// deliberately not here: required fields (job 1) and posting a kind you are
// not entitled to (job 2, "not negotiable"). Making either switchable would
// let an admin accidentally turn off the two things this whole handoff
// exists to build.
export type RuleKey =
  | "post_frequency_cap"
  | "duplicate_near_duplicate"
  | "post_link_reject"
  | "comment_link_hold"
  | "banned_goods_keywords"
  | "report_auto_hold"
  | "payment_details_hold"
  | "suspected_scam_patterns"
  | "health_medical_income_claims";

async function loadRuleFlags(): Promise<Map<RuleKey, boolean>> {
  const admin = createAdminClient();
  const { data } = await admin.from("board_moderation_rules").select("rule_key, enabled");
  const flags = new Map<RuleKey, boolean>();
  for (const row of data ?? []) flags.set(row.rule_key as RuleKey, row.enabled);
  return flags;
}

// Missing from the table (should never happen once seeded) defaults to on,
// same as "sensible defaults on" everywhere else in this file.
function isOn(flags: Map<RuleKey, boolean>, key: RuleKey): boolean {
  return flags.get(key) !== false;
}

// A link in a comment on a board of businesses is either spam or a
// competitor, near enough always. It is also the one thing about a comment
// that can be decided by counting rather than by reading, so it is the one
// content rule that runs automatically. It holds rather than removes: a
// person still decides, they just decide after it is out of sight instead
// of before.
const URL_PATTERN = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|co\.za|net|org|io|shop|link)\b)/i;

// A short allowlist for a NEW post's body -- a business's own number is
// already the reason wa.me exists on every card, so pointing at it is not
// spam, and a Growth/Facebook/Instagram/Maps link is how a real business
// proves itself rather than hides.
const LINK_ALLOWLIST = /\b(wa\.me|whatsapp\.com|facebook\.com|instagram\.com|google\.com\/maps|digitalflyer(sa)?\.co\.za)\b/i;

function hasDisallowedLink(text: string): boolean {
  return URL_PATTERN.test(text) && !LINK_ALLOWLIST.test(text);
}

// Job 1: "Every field that has a home must not be accepted in the body."
const PHONE_PATTERN = /(\+?27|0)[\s.-]?\d{2}[\s.-]?\d{3}[\s.-]?\d{4}/;
const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

/** Runs on a new post's title/body, before it is ever saved. */
export function contactDetailsInBody(text: string): "phone" | "email" | null {
  if (EMAIL_PATTERN.test(text)) return "email";
  if (PHONE_PATTERN.test(text)) return "phone";
  return null;
}

// Job 3: "the Board never touches money." Banking details, payment links
// and payment requests posted in a body or a comment are auto-held, not
// auto-removed -- this is the countable check for that.
const PAYMENT_DETAILS_PATTERN =
  /\b(eft|electronic transfer|bank(?:ing)? details?|account number|branch code|swift code|iban|proof of payment|deposit (?:required|first|upfront)|fnb|absa|standard bank|nedbank|capitec|tyme ?bank|banking app|pay ?fast|payfast|ozow|snapscan|zapper|yoco|western union|moneygram)\b/i;

export function containsPaymentDetails(text: string): boolean {
  return PAYMENT_DETAILS_PATTERN.test(text);
}

// Job 5: the banned list. DRAFT keyword sets -- starting points, not
// measured against real traffic, since there is none yet. Dewald approves
// the published wording (src/components/board/BannedListNotice.tsx)
// separately; these patterns only decide what gets blocked, not what the
// poster is told the list contains.
const BANNED_CATEGORIES: { label: string; pattern: RegExp }[] = [
  { label: "money lending or credit offers", pattern: /\b(loan shark|payday loan|micro ?loan|credit approved|instant cash loan)\b/i },
  { label: "network marketing or recruitment", pattern: /\b(mlm|pyramid scheme|join my team|multi.level marketing|pay to join)\b/i },
  { label: "firearms or weapons", pattern: /\b(firearm|pistol|rifle|ammunition|\bammo\b)\b/i },
  { label: "alcohol or tobacco", pattern: /\b(vodka|whisky|whiskey|cigarettes?|vape juice|e-?liquid)\b/i },
  { label: "medicines, supplements or health claims", pattern: /\b(prescription (?:only )?medicine|antibiotics? for sale|weight loss pills)\b/i },
  { label: "adult content or services", pattern: /\b(escort service|adult service|nsfw content)\b/i },
  { label: "live animals", pattern: /\b(puppies for sale|kittens for sale|live animals?|breeding pair)\b/i },
  { label: "event tickets", pattern: /\b(tickets? for sale|resale tickets?)\b/i },
  { label: "job adverts or job-wanted posts", pattern: /\b(now hiring|job vacancy|looking for work|cv attached|hiring immediately)\b/i },
];

function bannedCategoryMatch(text: string): string | null {
  for (const category of BANNED_CATEGORIES) {
    if (category.pattern.test(text)) return category.label;
  }
  return null;
}

// Starting keyword sets for the two "hold, don't reject" judgement-adjacent
// checks -- low-confidence on purpose, a human always reviews a hit.
const SCAM_PATTERN =
  /\b(send.*deposit.*first|western union|moneygram|too good to be true|urgent sale|wire transfer|pay before you view)\b/i;
const HEALTH_INCOME_PATTERN =
  /\b(guaranteed income|lose weight fast|miracle cure|doctor recommended|cures? [a-z]+ disease|make money fast)\b/i;

export type AutoRule = { rule: string; reason: string } | null;

/** Runs at submission time, before a comment is ever visible. */
export async function autoRuleForNewComment(body: string): Promise<AutoRule> {
  const flags = await loadRuleFlags();

  if (isOn(flags, "comment_link_hold") && hasDisallowedLink(body)) {
    return {
      rule: "link in comment",
      reason: "This comment contains a link, so it is waiting to be checked before it appears.",
    };
  }

  if (isOn(flags, "payment_details_hold") && containsPaymentDetails(body)) {
    return {
      rule: "payment details in comment",
      reason: "This comment mentions payment or banking details, so it is waiting to be checked before it appears.",
    };
  }

  return null;
}

/**
 * Runs at submission time, before a new post is ever saved.
 *
 * Job 4's countable, reject-at-submission checks: how many the poster has
 * made recently, whether this repeats one they already have live, a
 * disallowed link, or a match on the banned list. All four run only when
 * their own toggle is on, and the first match wins.
 */
export async function autoRuleForNewPost(args: {
  kind: string;
  title: string;
  body: string | null;
  /** growth_client_id for a member post, identity_id for a public one. */
  posterKey: { type: "member"; id: string } | { type: "identity"; id: string } | null;
}): Promise<AutoRule> {
  const flags = await loadRuleFlags();
  const text = `${args.title} ${args.body ?? ""}`;

  if (isOn(flags, "banned_goods_keywords")) {
    const category = bannedCategoryMatch(text);
    if (category) {
      return {
        rule: `banned list: ${category}`,
        reason: "The Board doesn't carry that. If this doesn't look right, get in touch and we'll take a look.",
      };
    }
  }

  if (isOn(flags, "post_link_reject") && hasDisallowedLink(text)) {
    return {
      rule: "link in new post",
      reason: "Take the link out of the description. Use the WhatsApp button on your post instead.",
    };
  }

  if (args.posterKey) {
    const admin = createAdminClient();
    const column = args.posterKey.type === "member" ? "posted_by_client_id" : "identity_id";

    if (isOn(flags, "post_frequency_cap")) {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [{ count: dayCount }, { count: monthCount }] = await Promise.all([
        admin.from("board_posts").select("id", { count: "exact", head: true }).eq(column, args.posterKey.id).gte("created_at", dayAgo),
        admin.from("board_posts").select("id", { count: "exact", head: true }).eq(column, args.posterKey.id).gte("created_at", monthAgo),
      ]);
      if ((dayCount ?? 0) >= 5 || (monthCount ?? 0) >= 20) {
        return {
          rule: "post frequency cap",
          reason: "That is a lot of posts recently. Give it a day, or take one down before adding another.",
        };
      }
    }

    if (isOn(flags, "duplicate_near_duplicate")) {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recent } = await admin
        .from("board_posts")
        .select("title")
        .eq(column, args.posterKey.id)
        .neq("status", "removed")
        .gte("created_at", weekAgo)
        .limit(10);

      const normalize = (value: string) =>
        new Set(
          value
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, "")
            .split(/\s+/)
            .filter(Boolean)
        );

      const titleWords = normalize(args.title);
      const isDuplicate = (recent ?? []).some((row) => {
        const otherWords = normalize(row.title);
        if (titleWords.size === 0 || otherWords.size === 0) return false;
        const intersection = [...titleWords].filter((w) => otherWords.has(w)).length;
        const union = new Set([...titleWords, ...otherWords]).size;
        return intersection / union >= 0.85;
      });

      if (isDuplicate) {
        return {
          rule: "duplicate post",
          reason: "This looks like a repeat of a post you already have live. Renew that one instead of posting again.",
        };
      }
    }
  }

  return null;
}

/**
 * Runs at submission time, before a new post is ever saved. The judgement-
 * adjacent checks that hold rather than reject: payment details anywhere,
 * suspected scam wording, and health/medical/income claims. Never blocks
 * the post from being created, only its visibility.
 */
export async function holdReasonForNewPost(title: string, body: string | null): Promise<AutoRule> {
  const flags = await loadRuleFlags();
  const text = `${title} ${body ?? ""}`;

  if (isOn(flags, "payment_details_hold") && containsPaymentDetails(text)) {
    return {
      rule: "payment details in post",
      reason: "This post mentions payment or banking details, so it is waiting to be checked before it appears.",
    };
  }

  if (isOn(flags, "suspected_scam_patterns") && SCAM_PATTERN.test(text)) {
    return {
      rule: "suspected scam wording",
      reason: "This post is waiting to be checked before it appears.",
    };
  }

  if (isOn(flags, "health_medical_income_claims") && HEALTH_INCOME_PATTERN.test(text)) {
    return {
      rule: "health, medical or income claim",
      reason: "This post is waiting to be checked before it appears.",
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
  const flags = await loadRuleFlags();
  if (!isOn(flags, "report_auto_hold")) return { held: false, rule: null };

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
