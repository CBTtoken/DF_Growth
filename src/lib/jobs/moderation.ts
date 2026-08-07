import { createAdminClient } from "@/lib/supabase/admin";

// Jobs moderation, the same split the Board settled on: auto-enforce
// anything countable, hold anything needing judgement, never auto-remove.
// A held vacancy is out of public view and waiting for a person.
//
// The one rule that ships on day one, from the spec: "No employer may
// request payment from a candidate for anything. Training, uniform,
// transport, placement, admin. Auto-hold on any post mentioning it. The
// advance-fee job scam is the most common in the country and it will
// arrive the week you launch."

const CANDIDATE_PAYS_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\b(registration|admin(istration)?|joining|application|placement|agency|training|upfront)\s*fee\b/i, label: "asks for a fee" },
  { pattern: /\bpay\s+(a|an|the|your)?\s*(fee|deposit|amount)\b/i, label: "asks for a payment" },
  { pattern: /\bdeposit\s+(required|needed|payable)\b/i, label: "asks for a deposit" },
  { pattern: /\b(buy|purchase|pay for)\s+(your|a|the)?\s*(uniform|kit|equipment|starter pack|materials)\b/i, label: "asks the candidate to buy something" },
  { pattern: /\b(send|transfer|deposit)\s+r?\s?\d+/i, label: "asks for money to be sent" },
  { pattern: /\bpay\s+r?\s?\d+/i, label: "asks for a payment" },
  { pattern: /\b(e-?wallet|ewallet|cash send|cashsend|money market voucher)\b/i, label: "mentions a money transfer method" },
  { pattern: /\brefundable\s+(fee|deposit|amount)\b/i, label: "asks for a refundable payment" },
];

/**
 * The auto-hold decision at submission time. Null means publish; a string
 * is the held_reason a person will read in the admin queue.
 */
export function holdReasonForVacancy(fields: { title: string; description: string; payText?: string | null }): string | null {
  const text = [fields.title, fields.description, fields.payText ?? ""].join("\n");
  for (const { pattern, label } of CANDIDATE_PAYS_PATTERNS) {
    if (pattern.test(text)) {
      return `Post ${label}. No employer may request payment from a candidate for anything.`;
    }
  }
  return null;
}

export type JobsModerationActor = { kind: "system" } | { kind: "employer"; employerId: string } | { kind: "admin"; email: string };

function actorLabel(actor: JobsModerationActor): string {
  switch (actor.kind) {
    case "system":
      return "system";
    case "employer":
      return `employer:${actor.employerId}`;
    case "admin":
      return `admin:${actor.email}`;
  }
}

export async function logJobsModeration(entry: {
  targetType: "candidate" | "vacancy";
  targetId: string;
  action: "held" | "removed" | "restored" | "published" | "expired" | "lapse_removed";
  rule: string;
  actor: JobsModerationActor;
  note?: string;
}) {
  const admin = createAdminClient();
  await admin.from("jobs_moderation_log").insert({
    target_type: entry.targetType,
    target_id: entry.targetId,
    action: entry.action,
    rule: entry.rule,
    actor: actorLabel(entry.actor),
    note: entry.note ?? null,
  });
}
