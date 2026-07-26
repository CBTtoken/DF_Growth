import Anthropic from "@anthropic-ai/sdk";
import { truncateOnWord, stripEmDashes } from "@/lib/text";

// Agent Programme Phase 1 Sec 1.6: "Reuse the existing Anthropic copy
// generation pattern from the member wizard." Same model, same thinking
// setting, same fence-stripping, same invented-year guard as
// lib/ai/draft-copy.ts, for the same reasons documented there. What
// differs is the brief: a member page sells a business, this writes a
// person speaking in first person.
const MODEL = "claude-sonnet-5";

export type AgentCopyInput = {
  fullName: string;
  town: string;
  // The four questions from Sec 1.6, in the order they are asked.
  before: string;
  why: string;
  who: string;
  area: string;
};

export type AgentCopyDraft = {
  heroPromise: string;
  storyText: string;
  offerText: string;
};

// Same guard as the member wizard's: any 4-digit year in the output that
// the agent never mentioned is treated as a fabricated date and fails the
// whole draft. Worth keeping here specifically because "I have been doing
// this since 2015" is exactly the shape of sentence a model reaches for
// when writing someone's origin story.
function containsInventedYear(draft: AgentCopyDraft, sourceText: string): boolean {
  const outputText = `${draft.heroPromise} ${draft.storyText} ${draft.offerText}`;
  const years = outputText.match(/\b(19|20)\d{2}\b/g) ?? [];
  return years.some((year) => !sourceText.includes(year));
}

// Best-effort, exactly like the member wizard's: a null return means the
// admin form stays blank and the copy gets written by hand, never an error
// state that blocks setting a page up.
export async function generateAgentPageCopy(input: AgentCopyInput): Promise<AgentCopyDraft | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const sourceText = [input.fullName, input.town, input.before, input.why, input.who, input.area].join("\n");

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1400,
      // Sonnet 5 returns an extended-thinking block by default, which can
      // consume the whole token budget on a short copywriting task and
      // leave nothing for the JSON. Disabled, same as draft-copy.ts.
      thinking: { type: "disabled" },
      system:
        "You write the page copy for a DigitalFlyer SA agent: a South African who " +
        "introduces small businesses to DigitalFlyer SA and earns commission when " +
        "they join. You are writing AS that person, in first person, in their own " +
        "register, from answers they gave to four questions.\n\n" +
        "The reader is a small business owner deciding whether to trust this " +
        "person. An agent sells trust, not a product, so the copy has to sound " +
        "like a real person talking, not like marketing.\n\n" +
        "Absolutely forbidden unless the exact fact appears in their answers:\n" +
        "- Any year, date, or length of time (\"for 15 years\", \"since 2019\")\n" +
        "- Any number of businesses helped, customers, or results achieved\n" +
        "- Any award, qualification, certification, or accreditation\n" +
        "- Any claim about what results a business will get\n" +
        "- Any price, fee, discount, or package for DigitalFlyer SA products\n\n" +
        "That last one is a rule the agent themselves is bound by: agents quote " +
        "our published prices only and may not advertise their own. Never put a " +
        "number on anything.\n\n" +
        "Never say or imply the agent is employed by DigitalFlyer SA, works for " +
        "us, or represents us. They are independent, and saying otherwise is a " +
        "breach of their own terms.\n\n" +
        "HOUSE STYLE, absolute, these override any other instinct:\n" +
        "1. NEVER use an em dash or an en dash. Not once, anywhere, in any field. " +
        "Use a comma, a full stop, or restructure the sentence. This is the single " +
        "most common thing to get wrong here.\n" +
        "2. NEVER use the words 'listing' or 'directory'. The DigitalFlyer SA " +
        "product is a 'marketplace'.\n" +
        "3. No exclamation marks, no 'passionate about', no 'let me help you take " +
        "your business to the next level'. Plain, warm, specific.\n\n" +
        "Reply with ONLY a JSON object, no markdown fences, no commentary, matching " +
        "exactly this shape: " +
        '{"heroPromise": string (ONE sentence, max 130 characters, first person, ' +
        "what this person will do for a business owner, sitting under their name " +
        "at the top of the page), " +
        '"storyText": string (2 or 3 short paragraphs separated by a single ' +
        "newline, first person, their story: what they did before, why they do " +
        "this now, who they want to help. This is the most personal block on the " +
        "page and it is set in a serif to mark it as a person speaking, so write " +
        "it like someone talking, not like a bio. Under 900 characters total), " +
        '"offerText": string (ONE short paragraph, max 320 characters, first ' +
        "person, what they actually do for a business that signs up with them, " +
        "and the area they cover. Practical, not aspirational)}.",
      messages: [
        {
          role: "user",
          content: [
            `My name: ${input.fullName}`,
            input.town ? `My town: ${input.town}` : null,
            `What I did before this: ${input.before}`,
            `Why I joined: ${input.why}`,
            `Who I most want to help: ${input.who}`,
            `The area I cover: ${input.area}`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });

    // Don't assume content[0] is the text block: another block type can
    // come first, which is what silently broke the member wizard once.
    const block = message.content.find((b) => b.type === "text");
    if (!block) return null;

    // Despite the system prompt saying not to, Claude sometimes wraps the
    // JSON in a markdown code fence. Strip it if present.
    const jsonText = block.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(jsonText);
    if (
      typeof parsed.heroPromise !== "string" ||
      typeof parsed.storyText !== "string" ||
      typeof parsed.offerText !== "string"
    ) {
      return null;
    }

    // stripEmDashes is the write-time backstop for the em dash ban: the
    // prompt forbids them, but a model instruction is not a guarantee and
    // this copy goes straight into the database and onto a live page.
    // truncateOnWord rather than a raw slice, for the reason Phase 0.4
    // found the hard way.
    const clean = (text: string, max: number) => truncateOnWord(stripEmDashes(text), max);

    const draft: AgentCopyDraft = {
      heroPromise: clean(parsed.heroPromise, 150),
      storyText: clean(parsed.storyText, 1000),
      offerText: clean(parsed.offerText, 360),
    };

    if (containsInventedYear(draft, sourceText)) {
      console.error("AI agent page copy rejected: contains a year not present in the input", draft);
      return null;
    }

    return draft;
  } catch (err) {
    console.error("AI agent page copy draft failed", err);
    return null;
  }
}
