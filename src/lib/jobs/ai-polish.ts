import Anthropic from "@anthropic-ai/sdk";
import { stripEmDashes } from "@/lib/text";
import type { WorkHistoryEntry } from "@/lib/jobs/cv-conversation";
export { AI_POLISH_CAP } from "@/lib/jobs/cv-conversation";

// The CV builder's AI wording pass (Dewald, 7 August walkthrough: "help
// them with sounding better, not making up elements, just check the
// grammar, spelling, suggest better content, maybe give them a list of
// recommendations to improve").
//
// Follows lib/ai/draft-copy.ts's hard-won conventions exactly, because the
// stakes are identical or higher: that file records Haiku fabricating
// facts twice in live testing despite explicit instructions, which is why
// it uses Sonnet plus a programmatic invented-year check as a second line
// of defence. A CV is a person's claim to a livelihood, so a fabricated
// qualification or invented employer is worse than a fabricated business
// tagline. Same model, same guard, same fence-stripping.
//
// Cost discipline comes from the spec ("AI cost in the CV builder scales
// with unemployment, not with revenue. Cap regenerations per CV. Store
// the output, not the process."): the cap and the storing happen in the
// server action, this module is the single pure call.
const MODEL = "claude-sonnet-5";

export type PolishInput = {
  summary: string | null;
  workHistory: WorkHistoryEntry[];
  roleLabel: string | null;
  yearsExperience: number | null;
  hasSkills: boolean;
};

export type PolishOutput = {
  summary: string | null;
  workDescriptions: string[];
  recommendations: string[];
};

function containsInventedYear(texts: string[], sourceText: string): boolean {
  const outputText = texts.join(" ");
  const years = outputText.match(/\b(19|20)\d{2}\b/g) ?? [];
  return years.some((year) => !sourceText.includes(year));
}

/**
 * Best-effort: the CV builder must never break because of this. A `null`
 * return means "leave everything exactly as typed", which is the state the
 * person was already in.
 */
export async function polishCvWording(input: PolishInput): Promise<PolishOutput | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const sourceText = [
    input.summary ?? "",
    ...input.workHistory.map((w) => `${w.employer} ${w.role} ${w.start} ${w.end ?? ""} ${w.description}`),
    input.roleLabel ?? "",
    String(input.yearsExperience ?? ""),
  ].join("\n");

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      // Same live-tested finding recorded in draft-copy.ts: the default
      // thinking block can consume the whole budget on a short copy task.
      thinking: { type: "disabled" },
      system:
        "You polish the wording of CVs for South African job seekers, many of whom " +
        "are not confident writers. Your job is to fix grammar and spelling, tighten " +
        "wording, and make what the person ACTUALLY SAID sound clear and professional. " +
        "You are strictly forbidden from adding anything they did not say. This is a " +
        "hard rule: a person could lose a job offer, or worse, for a claim on their CV " +
        "they cannot back up, so inventing anything is worse than leaving it plain.\n\n" +
        "Absolutely forbidden unless the exact fact appears in the input:\n" +
        "- Any qualification, certificate, licence, or training\n" +
        "- Any employer, job title, duty, or achievement not stated\n" +
        "- Any year, duration, or date\n" +
        "- Any skill not stated\n" +
        "- Inflating language: 'managed' stays 'managed' only if they said it, " +
        "'helped with' does not become 'led'\n\n" +
        "Corrections to spelling, grammar, capitalisation and sentence structure are " +
        "always allowed and are the main point. Keep the person's own voice, just " +
        "cleaner. South African English.\n\n" +
        "Also produce a short list of practical recommendations for improving their " +
        "profile: things THEY could add or do (for example: add your work history, " +
        "mention how long you worked at each place, add a contact number, list more " +
        "of your skills). Plain language, no jargon, maximum 4, each one sentence. " +
        "Never recommend adding an ID number, bank details, a photo, or references' " +
        "contact details.\n\n" +
        "HOUSE STYLE, absolute:\n" +
        "1. NEVER use an em dash or an en dash, anywhere. Use a comma or a full stop.\n" +
        "2. Do not invent anything, as above.\n\n" +
        "Reply with ONLY a JSON object, no markdown fences, no commentary, matching " +
        "exactly this shape: " +
        '{"summary": string or null (the polished summary, null if no summary was given), ' +
        '"workDescriptions": array of strings (the polished description for each work ' +
        "history entry, in the same order as given, same length as the input list, " +
        "empty string where the input description was empty), " +
        '"recommendations": array of strings (max 4)}.',
      messages: [
        {
          role: "user",
          content: [
            input.roleLabel ? `Looking for work as: ${input.roleLabel}` : null,
            input.yearsExperience != null ? `Years of experience: ${input.yearsExperience}` : null,
            `Summary (their own words): ${input.summary ?? "(none given)"}`,
            input.workHistory.length
              ? `Work history:\n${input.workHistory
                  .map((w, i) => `${i + 1}. ${w.role} at ${w.employer} (${w.start} to ${w.current ? "present" : w.end}). Description: ${w.description || "(none)"}`)
                  .join("\n")}`
              : "Work history: (none given)",
            input.hasSkills ? null : "They have not listed any skills yet.",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });

    const block = message.content.find((b) => b.type === "text");
    if (!block) return null;

    // Same backstop as draft-copy.ts: the prompt forbids fences, and
    // Claude sometimes adds them anyway.
    const jsonText = block.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(jsonText);

    if (
      (parsed.summary !== null && typeof parsed.summary !== "string") ||
      !Array.isArray(parsed.workDescriptions) ||
      !Array.isArray(parsed.recommendations) ||
      parsed.workDescriptions.length !== input.workHistory.length
    ) {
      return null;
    }

    const summary = parsed.summary ? stripEmDashes(String(parsed.summary)).slice(0, 600) : null;
    const workDescriptions = parsed.workDescriptions.map((d: unknown) => stripEmDashes(String(d ?? "")).slice(0, 400));
    const recommendations = parsed.recommendations
      .slice(0, 4)
      .map((r: unknown) => stripEmDashes(String(r ?? "")).slice(0, 200))
      .filter((r: string) => r.length > 0);

    // The same programmatic second line of defence draft-copy.ts carries:
    // any year in the output that the person never typed fails the whole
    // polish rather than shipping an invented date onto a real CV.
    if (containsInventedYear([summary ?? "", ...workDescriptions], sourceText)) {
      console.error("CV polish rejected: output contained a year not present in the input");
      return null;
    }

    return { summary, workDescriptions, recommendations };
  } catch (err) {
    console.error("CV polish failed", err);
    return null;
  }
}
