// Aim a CV at one job. Handoff Job 5, and the thing a rebuild credit
// actually buys.
//
// "The AI restates their own facts using that advert's own words and
// reorders their skills to lead with the ones the advert asks for. It may
// never add a skill, a duty, a date or a number that is not already on the
// person's CV. If the advert asks for something they do not have, the
// rebuild simply does not claim it."
//
// That last sentence is the hard part, and it is why this file is longer
// than the prompt it wraps. Mirroring an advert's words is the single
// highest-return tactic available to a candidate AND the single strongest
// pull towards fabrication a language model will ever feel: the advert
// says "forklift licence" in bold, the person has never driven one, and
// every instinct in the model is to bridge that gap.
//
// So the gap is closed twice. Before the call, the words the person
// cannot support are computed and handed to the model as an explicit
// banned list. After the call, the output is checked against that same
// list and thrown away if it used one. The prompt is the request; the
// check is the guarantee.

import Anthropic from "@anthropic-ai/sdk";
import { stripEmDashes } from "@/lib/text";
import {
  claimsUnsupported,
  inventedNumbers,
  reconcileSkillOrder,
  unsupportedTerms,
} from "@/lib/jobs/ai-guard";
import type { WorkHistoryEntry } from "@/lib/jobs/cv-conversation";

const MODEL = "claude-sonnet-5";

export type TailorInput = {
  advertTitle: string | null;
  advertText: string;
  roleTitles: string[];
  yearsExperience: number | null;
  skills: string[];
  workHistory: WorkHistoryEntry[];
  summary: string | null;
};

export type TailorOutput = {
  summary: string;
  workDescriptions: string[];
  /** The person's own skills, reordered. Never added to. */
  skillsOrder: string[];
};

/** Best-effort: null means nothing was generated and nothing is charged. */
export async function tailorCvToAdvert(input: TailorInput): Promise<TailorOutput | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const cvText = [
    input.summary ?? "",
    input.roleTitles.join(" "),
    String(input.yearsExperience ?? ""),
    input.skills.join(" "),
    ...input.workHistory.map(
      (w) => `${w.employer} ${w.role} ${w.start} ${w.end ?? ""} ${w.description} ${(w.impacts ?? []).join(" ")}`,
    ),
  ].join("\n");

  const banned = unsupportedTerms(input.advertText, cvText);

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      thinking: { type: "disabled" },
      system:
        "You aim an existing CV at one specific job advert, for South African job " +
        "seekers. You are given the person's own CV facts and the advert. You " +
        "rewrite their summary and their work descriptions to lead with the " +
        "experience this advert is asking for, using the advert's own words WHERE " +
        "THE PERSON'S OWN FACTS ALREADY SUPPORT THEM, and you reorder their " +
        "existing skills so the ones the advert wants come first.\n\n" +
        "You are not writing a new CV. Every fact in your output must already be " +
        "in the input. You are choosing what to put first and what words to say it " +
        "in.\n\nABSOLUTELY FORBIDDEN:\n" +
        "- Adding any skill, duty, qualification, licence, ticket or tool the " +
        "person did not list. If the advert asks for something they do not have, " +
        "say nothing about it. Do not say they are willing to learn it, do not say " +
        "they have related experience, do not mention it at all.\n" +
        "- Adding any number, date, duration or quantity not in the input.\n" +
        "- Adding an employer or job title not in the input.\n" +
        "- Removing a skill from the list. You reorder it, you never shorten it.\n" +
        "- Motivational-poster language or corporate jargon. Plain South African " +
        "English only.\n" +
        "- An em dash or an en dash, anywhere. Use a comma or a full stop.\n\n" +
        (banned.length
          ? "These words appear in the advert and are NOT supported by anything on " +
            "this person's CV. You may not use any of them, in any form:\n" +
            banned.join(", ") +
            "\n\nThis is checked programmatically after you reply. If you use one, " +
            "your entire answer is discarded and the person gets nothing.\n\n"
          : "") +
        "Reply with ONLY a JSON object, no markdown fences, no commentary, matching " +
        'exactly this shape: {"summary": string, "workDescriptions": array of ' +
        'strings one per work entry in the same order as given, "skillsOrder": ' +
        "array of the person's EXISTING skill strings, all of them, reordered so " +
        "the ones this advert asks for come first}.",
      messages: [
        {
          role: "user",
          content: [
            `THE ADVERT${input.advertTitle ? ` (${input.advertTitle})` : ""}:\n${input.advertText.slice(0, 6000)}`,
            "",
            "THEIR CV:",
            input.roleTitles.length ? `Work they do: ${input.roleTitles.join(", ")}` : null,
            input.yearsExperience != null ? `Years of experience: ${input.yearsExperience}` : null,
            input.skills.length ? `Their skills: ${input.skills.join(", ")}` : "Their skills: (none listed)",
            input.summary ? `Their summary: ${input.summary}` : null,
            input.workHistory.length
              ? `Their work history:\n${input.workHistory
                  .map((w, i) => {
                    const impacts = (w.impacts ?? []).filter((x) => x?.trim());
                    return [
                      `${i + 1}. ${w.role} at ${w.employer} (${w.start} to ${w.current ? "present" : w.end}).`,
                      `   What they did: ${w.description || "(nothing written)"}`,
                      impacts.length ? `   Numbers they gave: ${impacts.join("; ")}` : null,
                    ]
                      .filter(Boolean)
                      .join("\n");
                  })
                  .join("\n")}`
              : "Their work history: (none given)",
          ]
            .filter((l) => l !== null)
            .join("\n"),
        },
      ],
    });

    // Cost observability. This is the one call in Jobs that a person pays
    // for, so what it actually costs must be visible in the logs rather
    // than estimated from token arithmetic afterwards. A rebuild that
    // gets rejected below still cost this much and earns nothing.
    console.log(
      `[cv-tailor] in=${message.usage.input_tokens} out=${message.usage.output_tokens} banned=${banned.length}`,
    );

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

    // Gate one: no number that is not already theirs.
    const invented = inventedNumbers([summary, ...workDescriptions], cvText);
    if (invented.length > 0) {
      console.error("CV tailor rejected: invented numbers", invented);
      return null;
    }

    // Gate two: no claim the advert asked for and their CV cannot support.
    const claimed = claimsUnsupported([summary, ...workDescriptions], banned);
    if (claimed.length > 0) {
      console.error("CV tailor rejected: claimed unsupported requirements", claimed);
      return null;
    }

    // Gate three: the skill list is reconciled against what they actually
    // have, rather than trusted. Anything invented is dropped, anything
    // dropped is restored.
    const skillsOrder = reconcileSkillOrder(
      Array.isArray(parsed.skillsOrder) ? parsed.skillsOrder.map((s: unknown) => String(s ?? "")) : [],
      input.skills,
    );

    return { summary, workDescriptions, skillsOrder };
  } catch (err) {
    console.error("CV tailor failed", err);
    return null;
  }
}
