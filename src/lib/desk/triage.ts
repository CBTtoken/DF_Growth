import Anthropic from "@anthropic-ai/sdk";
import type { DeskArea, DeskEffort, DeskItem } from "@/lib/desk/types";

// The only place an LLM is used in The Desk, doing exactly one job: proposing
// four fields for items that have no next action yet.
//
// It proposes, it never writes. Nothing reaches the database until the
// operator presses Accept, and the title is never sent back from here at all:
// every proposal is matched to the item by index and the stored title is used
// as-is, so a misspelling the operator typed stays exactly as typed.
const MODEL = "claude-opus-5";

export type TriageProposal = {
  id: string;
  title: string;
  area: DeskArea;
  venture: string | null;
  effort: DeskEffort;
  next_action: string;
};

type RawProposal = {
  i?: unknown;
  area?: unknown;
  venture?: unknown;
  effort?: unknown;
  next_action?: unknown;
};

const SYSTEM = [
  "You are sorting a single operator's task list. He runs several small businesses in South Africa",
  "while working a day job, and he is holding about forty open threads in his head.",
  "",
  "For each item you are given, propose exactly four fields and nothing else:",
  "",
  "- area: 'personal' or 'business'.",
  "- venture: a short free-text tag naming which venture the item belongs to. Reuse one of the",
  "  existing tags you are given whenever it fits. If you cannot tell with confidence, return null.",
  "  Never guess a venture to avoid returning null.",
  "- effort: 'shallow' for something that can be done tired, in one sitting, without deep thought.",
  "  'deep' for something needing real concentration or a long uninterrupted block.",
  "- next_action: one sentence naming the literal next physical step. It must be something a person",
  "  could stand up and do. 'Email Xneelo support to ask which registrar holds the domain' is right.",
  "  'Sort out the domain' is wrong, because it restates the item instead of naming a step.",
  "",
  "Hard rules:",
  "- Never rewrite, correct, tidy or return the title. You are not given a title field to change.",
  "- Never invent an item, never merge two items, never split one. Return exactly one object per",
  "  input index, using the index you were given.",
  "- Return JSON only. No prose before or after, no markdown fences.",
].join("\n");

// Strips a markdown fence if the model adds one anyway. It is told not to,
// and it usually does not, but a fence has broken JSON.parse on this codebase
// before and the guard costs nothing.
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

export async function proposeTriage(
  items: DeskItem[],
  knownVentures: string[]
): Promise<{ proposals: TriageProposal[]; error?: string }> {
  if (items.length === 0) return { proposals: [] };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { proposals: [], error: "No Anthropic key is set in this environment." };

  const numbered = items.map((item, index) => `${index}: ${item.title}`).join("\n");
  const ventureLine =
    knownVentures.length > 0
      ? `Existing venture tags, reuse these where they fit: ${knownVentures.join(", ")}.`
      : "There are no existing venture tags yet.";

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 16000,
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
            "Items, one per line, each prefixed with its index:",
            numbered,
            "",
            'Return a JSON array. Each element: {"i": <index>, "area": "...", "venture": "..." or null, "effort": "...", "next_action": "..."}',
          ].join("\n"),
        },
      ],
    });

    if (message.stop_reason === "refusal") {
      return { proposals: [], error: "The model declined to sort this batch." };
    }

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { proposals: [], error: "The model returned nothing to read." };
    }

    const parsed: unknown = JSON.parse(stripFences(textBlock.text));
    if (!Array.isArray(parsed)) {
      return { proposals: [], error: "The model did not return a list." };
    }

    const seen = new Set<number>();
    const proposals: TriageProposal[] = [];

    for (const raw of parsed as RawProposal[]) {
      const index = typeof raw?.i === "number" ? raw.i : Number.NaN;
      const item = items[index];
      // An index outside the batch, or a repeat, means the model invented or
      // duplicated an item. Dropped rather than shown.
      if (!item || seen.has(index)) continue;
      seen.add(index);

      const nextAction = typeof raw.next_action === "string" ? raw.next_action.trim() : "";
      const venture = typeof raw.venture === "string" ? raw.venture.trim() : "";

      proposals.push({
        id: item.id,
        title: item.title,
        area: asArea(raw.area),
        venture: venture.length > 0 ? venture : null,
        effort: asEffort(raw.effort),
        next_action: nextAction,
      });
    }

    return { proposals };
  } catch (error) {
    console.error("desk: triage failed", error);
    return { proposals: [], error: "The sort call failed. Try again." };
  }
}
