import Anthropic from "@anthropic-ai/sdk";
import { stripEmDashes } from "@/lib/text";
import { inventedNumbers } from "@/lib/jobs/ai-guard";
import type { WorkHistoryEntry } from "@/lib/jobs/cv-conversation";

// Write with AI (pre-launch handoff Job 3): drafts the CV's prose -- the
// summary and each work history description -- from the structured facts
// the person supplied, where the polish pass (ai-polish.ts) only tidies
// text they already wrote. Same model and the same anti-fabrication
// posture, for the same reason recorded there: a CV is a claim to a
// livelihood, and Haiku fabricated facts twice in this repo's live
// testing, so Sonnet plus a programmatic invented-year check. "It may
// only rewrite what the person actually supplied" is the handoff's own
// wording and the whole contract.
const MODEL = "claude-sonnet-5";

export type WriteCvInput = {
  roleTitles: string[];
  experienceLevelLabel: string | null;
  yearsExperience: number | null;
  suburb: string | null;
  province: string | null;
  availabilityLabel: string | null;
  skills: string[];
  workHistory: WorkHistoryEntry[];
  /** Whatever they typed themselves; raw material, never discarded silently. */
  typedSummary: string | null;
};

export type WriteCvOutput = {
  summary: string;
  workDescriptions: string[];
};


/** Best-effort: null means "nothing generated", the person keeps typing. */
export async function writeCvFromFacts(input: WriteCvInput): Promise<WriteCvOutput | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const sourceText = [
    input.typedSummary ?? "",
    input.roleTitles.join(" "),
    String(input.yearsExperience ?? ""),
    input.skills.join(" "),
    ...input.workHistory.map(
      (w) =>
        `${w.employer} ${w.role} ${w.start} ${w.end ?? ""} ${w.description} ${(w.impacts ?? []).join(" ")}`,
    ),
  ].join("\n");

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1200,
      // draft-copy.ts's live-tested finding: default thinking can eat the
      // whole budget on a short copy task.
      thinking: { type: "disabled" },
      system:
        "You write short CV prose for South African job seekers, many of whom are " +
        "not confident writers. You are given only structured facts the person " +
        "entered themselves. Write a professional two-to-three sentence summary in " +
        "the first person, and one clear description per work history entry.\n\n" +
        // Handoff Job 1. An employer's first scan lasts six or seven
        // seconds and checks job title match, evidence of scale, and
        // progression. It does not read duty lists. Where the person gave
        // us numbers, this is what turns them into the thing that gets read.
        "EVIDENCE, NOT DUTIES. Employers ignore duty lists. They read numbers, " +
        "percentages and quantities. Where a work entry has 'Numbers they gave', " +
        "build the description around those, in the shape: what they accomplished, " +
        "as measured by the number, by doing what. Restate ONLY what they typed.\n\n" +
        "Where a work entry has NO numbers, write a clean, specific action " +
        "description instead. Never invent a metric to fill the gap, and never " +
        "hedge with empty phrases like 'improved efficiency significantly' or " +
        "'consistently exceeded expectations'. A plain sentence saying what they " +
        "actually did is worth more than a vague claim.\n\n" +
        "You may ONLY restate facts that appear in the input. This is a hard rule: " +
        "a person could lose a job offer, or worse, for a claim on their CV they " +
        "cannot back up.\n\nAbsolutely forbidden unless the exact fact appears in " +
        "the input:\n" +
        "- Any qualification, certificate, licence, or training\n" +
        "- Any employer, job title, duty, or achievement not stated\n" +
        "- Any year, duration, or date\n" +
        "- ANY NUMBER AT ALL that does not appear in the input. Not a count, not " +
        "a percentage, not an amount, not a team size. If they did not type the " +
        "number, it does not exist. This is checked programmatically after you " +
        "reply and your whole answer is thrown away if it fails.\n" +
        "- Any skill not stated\n" +
        "- Motivational-poster language or corporate jargon ('dynamic', 'passionate " +
        "self-starter', 'results-driven'). Plain South African English only.\n\n" +
        "If a work history entry has no description, write one plain sentence from " +
        "only its role, employer and dates, nothing more.\n\n" +
        "HOUSE STYLE, absolute:\n" +
        "1. NEVER use an em dash or an en dash, anywhere. Use a comma or a full stop.\n" +
        "2. Do not invent anything, as above.\n\n" +
        "Reply with ONLY a JSON object, no markdown fences, no commentary, matching " +
        'exactly this shape: {"summary": string, "workDescriptions": array of ' +
        "strings, one per work history entry in the same order as given, empty " +
        "array if no work history was given}.",
      messages: [
        {
          role: "user",
          content: [
            input.roleTitles.length ? `Work they do: ${input.roleTitles.join(", ")}` : null,
            input.experienceLevelLabel ? `Level: ${input.experienceLevelLabel}` : null,
            input.yearsExperience != null ? `Years of experience: ${input.yearsExperience}` : null,
            input.suburb || input.province
              ? `Based in: ${[input.suburb, input.province].filter(Boolean).join(", ")}`
              : null,
            input.availabilityLabel ? `Available: ${input.availabilityLabel}` : null,
            input.skills.length ? `Skills they listed: ${input.skills.join(", ")}` : null,
            input.typedSummary ? `What they wrote about themselves: ${input.typedSummary}` : null,
            input.workHistory.length
              ? `Work history:\n${input.workHistory
                  .map((w, i) => {
                    const impacts = (w.impacts ?? []).filter((x) => x?.trim());
                    return [
                      `${i + 1}. ${w.role} at ${w.employer} (${w.start} to ${w.current ? "present" : w.end}).`,
                      `   Their notes: ${w.description || "(none)"}`,
                      impacts.length
                        ? `   Numbers they gave: ${impacts.join("; ")}`
                        : "   Numbers they gave: (none, so use no numbers for this entry)",
                    ].join("\n");
                  })
                  .join("\n")}`
              : "Work history: (none given)",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });

    const block = message.content.find((b) => b.type === "text");
    if (!block) return null;

    const jsonText = block.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(jsonText);

    if (
      typeof parsed.summary !== "string" ||
      !Array.isArray(parsed.workDescriptions) ||
      parsed.workDescriptions.length !== input.workHistory.length
    ) {
      return null;
    }

    const summary = stripEmDashes(String(parsed.summary)).slice(0, 600);
    const workDescriptions = parsed.workDescriptions.map((d: unknown) =>
      stripEmDashes(String(d ?? "")).slice(0, 400),
    );

    const invented = inventedNumbers([summary, ...workDescriptions], sourceText);
    if (invented.length > 0) {
      // The whole answer goes, not just the offending line: a model that
      // fabricated one number is not a model whose other sentences have
      // been earned. The person is told the writing did not work and
      // spends nothing, which is the right way round.
      console.error("CV write rejected: output contained numbers not present in the input", invented);
      return null;
    }

    return { summary, workDescriptions };
  } catch (err) {
    console.error("CV write failed", err);
    return null;
  }
}
