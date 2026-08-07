import Anthropic from "@anthropic-ai/sdk";
import { stripEmDashes } from "@/lib/text";

// Write with AI for the employer's advert (handoff Job 6: "available here
// too, on the same rules. It may only restate what the employer
// supplied"). Same model and fabrication posture as the CV side; the
// output is applied to the form fields client-side where the employer
// keeps editing, and nothing publishes without the preview step anyway.
const MODEL = "claude-sonnet-5";

export type VacancyWordingInput = {
  title: string;
  duties: string;
  mustHave: string;
  niceToHave: string;
  qualifications: string;
  selectionProcess: string;
};

export type VacancyWordingOutput = VacancyWordingInput;

export async function tidyVacancyWording(
  input: VacancyWordingInput,
): Promise<VacancyWordingOutput | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      thinking: { type: "disabled" },
      system:
        "You tidy the wording of job adverts for South African small businesses. " +
        "Fix grammar and spelling, tighten wording, and make each section clear and " +
        "professional. You may ONLY restate what the employer supplied. Never add a " +
        "duty, requirement, qualification, benefit, or promise they did not state. " +
        "Never add or change pay. Plain South African English, no corporate jargon.\n\n" +
        "A job advert may NEVER ask the applicant to pay for anything (training, " +
        "uniform, admin fee, deposit). If the input contains such a request, keep it " +
        "unchanged; it is not yours to launder into nicer words.\n\n" +
        "HOUSE STYLE, absolute: NEVER use an em dash or an en dash, anywhere. Use a " +
        "comma or a full stop.\n\n" +
        "Reply with ONLY a JSON object, no markdown fences, matching exactly: " +
        '{"title": string, "duties": string, "mustHave": string, "niceToHave": string, ' +
        '"qualifications": string, "selectionProcess": string}. Keep an empty input ' +
        "field empty in the output.",
      messages: [
        {
          role: "user",
          content: [
            `Title: ${input.title || "(empty)"}`,
            `Duties and responsibilities: ${input.duties || "(empty)"}`,
            `Non-negotiable requirements: ${input.mustHave || "(empty)"}`,
            `Nice to have: ${input.niceToHave || "(empty)"}`,
            `Qualifications required: ${input.qualifications || "(empty)"}`,
            `Selection process: ${input.selectionProcess || "(empty)"}`,
          ].join("\n"),
        },
      ],
    });

    const block = message.content.find((b) => b.type === "text");
    if (!block) return null;

    const jsonText = block.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(jsonText);

    const clean = (v: unknown, max: number, fallback: string) => {
      const t = stripEmDashes(String(v ?? "")).slice(0, max);
      return t.trim() ? t : fallback;
    };

    return {
      title: clean(parsed.title, 90, input.title),
      duties: clean(parsed.duties, 2000, input.duties),
      mustHave: clean(parsed.mustHave, 1500, input.mustHave),
      niceToHave: input.niceToHave ? clean(parsed.niceToHave, 1500, input.niceToHave) : "",
      qualifications: clean(parsed.qualifications, 1000, input.qualifications),
      selectionProcess: clean(parsed.selectionProcess, 1500, input.selectionProcess),
    };
  } catch (err) {
    console.error("Vacancy wording tidy failed", err);
    return null;
  }
}
