import Anthropic from "@anthropic-ai/sdk";
import type { DeskArea, DeskEffort, DeskItem, DeskStream } from "@/lib/desk/types";

// The only place an LLM is used in The Desk, doing exactly one job: proposing
// fields for items that have no next action yet, and proposing where one
// capture is really several things.
//
// It proposes, it never writes. Nothing reaches the database until the
// operator presses Accept.
//
// Titles are the hard part. The operator is dyslexic and his words are the
// point, so the model is never allowed to write a title. On a split it must
// return spans copied out of what he typed, and every span is checked against
// the original text in code below. A span that is not character-for-character
// present is dropped, so a day when the model paraphrases produces fewer
// proposals rather than reworded ones.
const MODEL = "claude-opus-5";

export type TriagePart = {
  title: string;
  area: DeskArea;
  stream: DeskStream;
  venture: string | null;
  effort: DeskEffort;
  next_action: string;
};

export type TriageProposal = {
  id: string;
  originalTitle: string;
  parts: TriagePart[];
};

const SYSTEM = [
  "You are sorting a single operator's task list. He runs several small businesses in South Africa",
  "while working a day job, and he is holding about seventy open threads in his head.",
  "",
  "For each item you are given, return one or more parts. Most items are one part. Return more than",
  "one part only when a single capture plainly contains separate pieces of work that would be done",
  "at different times or by different people.",
  "",
  "Each part has exactly these fields:",
  "",
  "- title: a span of the ORIGINAL text, copied character for character. For a single-part item this",
  "  is the whole original text. For a split, each title is a contiguous stretch of the original.",
  "  Never rewrite, correct, tidy, translate or re-punctuate it. Misspellings stay. If you cannot",
  "  split without rewording, return one part.",
  "- area: 'personal' or 'business'.",
  "- stream: 'own' for his own companies (DigitalFlyer SA, Growth, KatisoBiz, The Board, CBT,",
  "  Kwaai Press, The Desk, HelpLift, Vowie, Standing 365), 'client' for other people's businesses",
  "  (SVC, Moxie, FortisLex, Alite), 'life' for home, family, health and personal admin.",
  "- venture: a short free-text tag naming which venture it belongs to. Reuse an existing tag you",
  "  are given whenever it fits. Return null rather than guessing.",
  "- effort: 'shallow' for something that can be done tired, in one sitting, without deep thought.",
  "  'deep' for something needing real concentration or a long uninterrupted block.",
  "- next_action: one sentence naming the literal next physical step. It must be something a person",
  "  could stand up and do. 'Email Xneelo support to ask which registrar holds the domain' is right.",
  "  'Sort out the domain' is wrong, because it restates the item instead of naming a step.",
  "",
  "Hard rules:",
  "- Never invent an item and never merge two separate captures.",
  "- Return exactly one object per input index, using the index you were given.",
  "- Return JSON only. No prose before or after, no markdown fences.",
].join("\n");

type RawPart = {
  title?: unknown;
  area?: unknown;
  stream?: unknown;
  venture?: unknown;
  effort?: unknown;
  next_action?: unknown;
};

type RawProposal = { i?: unknown; parts?: unknown };

function stripFences(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

function asArea(value: unknown): DeskArea {
  return value === "personal" ? "personal" : "business";
}

function asEffort(value: unknown): DeskEffort {
  return value === "deep" ? "deep" : "shallow";
}

function asStream(value: unknown, fallback: DeskStream): DeskStream {
  return value === "own" || value === "client" || value === "life" ? value : fallback;
}

// The verbatim check. A proposed title has to appear in the original text
// exactly, ignoring only the whitespace at its ends.
function verbatimSpan(original: string, proposed: unknown): string | null {
  if (typeof proposed !== "string") return null;
  const span = proposed.trim();
  if (span.length === 0) return null;
  if (span === original.trim()) return original.trim();
  return original.includes(span) ? span : null;
}

export async function proposeTriage(
  items: DeskItem[],
  knownVentures: string[]
): Promise<{ proposals: TriageProposal[]; error?: string; dropped: number }> {
  if (items.length === 0) return { proposals: [], dropped: 0 };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { proposals: [], error: "No Anthropic key is set in this environment.", dropped: 0 };

  const numbered = items.map((item, index) => `${index}: ${item.title}`).join("\n");
  const ventureLine =
    knownVentures.length > 0
      ? `Existing venture tags, reuse these where they fit: ${knownVentures.join(", ")}.`
      : "There are no existing venture tags yet.";

  try {
    const anthropic = new Anthropic({ apiKey });

    // Streamed, and then collected. The SDK refuses a non-streaming request
    // whose max_tokens implies it could run past ten minutes, and splitting
    // needs the headroom: a batch of seventy items can return several parts
    // each. Found live, on the first real split run, at 32000 tokens.
    const message = await anthropic.messages
      .stream({
        model: MODEL,
        max_tokens: 32000,
        // Low effort on purpose. This is short classification over one-line
        // items, and the operator is waiting on the screen for the result.
        output_config: { effort: "low" },
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              ventureLine,
              "",
              "Items, one per line, each prefixed with its index. An item may itself contain line breaks.",
              numbered,
              "",
              'Return a JSON array. Each element: {"i": <index>, "parts": [{"title": "...", "area": "...", "stream": "...", "venture": "..." or null, "effort": "...", "next_action": "..."}]}',
            ].join("\n"),
          },
        ],
      })
      .finalMessage();

    if (message.stop_reason === "refusal") {
      return { proposals: [], error: "The model declined to sort this batch.", dropped: 0 };
    }

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { proposals: [], error: "The model returned nothing to read.", dropped: 0 };
    }

    const parsed: unknown = JSON.parse(stripFences(textBlock.text));
    if (!Array.isArray(parsed)) {
      return { proposals: [], error: "The model did not return a list.", dropped: 0 };
    }

    const seen = new Set<number>();
    const proposals: TriageProposal[] = [];
    let dropped = 0;

    for (const raw of parsed as RawProposal[]) {
      const index = typeof raw?.i === "number" ? raw.i : Number.NaN;
      const item = items[index];
      // An index outside the batch, or a repeat, means the model invented or
      // duplicated an item. Dropped rather than shown.
      if (!item || seen.has(index)) continue;
      seen.add(index);

      const rawParts = Array.isArray(raw.parts) ? (raw.parts as RawPart[]) : [];
      const parts: TriagePart[] = [];

      for (const rawPart of rawParts) {
        const title = verbatimSpan(item.title, rawPart.title);
        if (!title) {
          dropped++;
          continue;
        }

        const nextAction = typeof rawPart.next_action === "string" ? rawPart.next_action.trim() : "";
        const venture = typeof rawPart.venture === "string" ? rawPart.venture.trim() : "";

        parts.push({
          title,
          area: asArea(rawPart.area),
          stream: asStream(rawPart.stream, item.stream),
          venture: venture.length > 0 ? venture : null,
          effort: asEffort(rawPart.effort),
          next_action: nextAction,
        });
      }

      if (parts.length === 0) continue;

      // A split whose pieces do not between them mention the whole item is
      // still a split, but a single part that is only a fragment of the
      // original would quietly shorten the title. Widen it back.
      if (parts.length === 1) parts[0].title = item.title;

      proposals.push({ id: item.id, originalTitle: item.title, parts });
    }

    return { proposals, dropped };
  } catch (error) {
    console.error("desk: triage failed", error);
    return { proposals: [], error: "The sort call failed. Try again.", dropped: 0 };
  }
}
