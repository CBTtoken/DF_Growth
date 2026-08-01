import Anthropic from "@anthropic-ai/sdk";
import type { Block, Opener } from "./types";

// The co-editor.
//
// Dewald reversed the handoff's "do not build an AI writing interface" on
// 1 August 2026, and his reasoning was better than the handoff's: if you are
// charging for a premium tool, sending the writer to another window is a
// hole in the product.
//
// The line that does not move is a different one. The model writes and
// composes. It never lays out a page. It returns a headline, a standfirst
// and a list of blocks, and the deterministic measurer decides where the
// pages break, exactly as it does for text typed by hand. So an article
// still occupies a known number of pages and the contents page can still be
// trusted.
//
// It also never invents facts. A magazine that prints something a model made
// up about a real South African is a different kind of problem from a badly
// worded paragraph, and the prompt treats that as the hard rule it is.

const MODEL = "claude-opus-5";

export type CoEditorTurn = {
  role: "user" | "assistant";
  content: string;
};

/** What comes back, ready for the editor to accept or argue with. */
export type CoEditorDraft = {
  kicker: string;
  headline: string;
  headlineTurn: string;
  standfirst: string;
  blocks: Block[];
  /**
   * Pictures the piece needs, with the size each slot actually wants.
   *
   * Dewald asked for exactly this: leave a marker saying an image belongs
   * here, and say what size it should be. The sizes are computed from the
   * page rather than guessed by the model, because the page is a fixed
   * physical object and the model has no idea how wide a column is.
   */
  imagesNeeded: { where: string; what: string; widthPx: number; heightPx: number }[];
  /** What the co-editor wants to say back, in its own words. */
  note: string;
};

export type PublicationVoice = {
  name: string;
  definition: string | null;
  houseRules: Record<string, unknown>;
};

/**
 * The brief the model works to.
 *
 * Assembled from the publication rather than written here, which is the
 * whole point: another magazine on Kwaai Press gets its own voice and its
 * own rules without a line of this file changing.
 */
export function buildSystem(
  publication: PublicationVoice,
  pillar: { label: string; territory: string },
  section: string,
  pages: number
): string {
  const rules = publication.houseRules ?? {};
  const banned = Array.isArray(rules.bannedPhrases) ? (rules.bannedPhrases as string[]) : [];
  const never = Array.isArray(rules.neverCarry) ? (rules.neverCarry as string[]) : [];

  // Roughly 380 words fill a page at 12pt on 16pt in a 182mm column, minus
  // the masthead on the first one. Given as a range because a writer told to
  // hit a number pads to reach it.
  const target = Math.max(200, pages * 380 - 150);

  const lines = [
    `You are the co-editor of ${publication.name}${publication.definition ? `, ${publication.definition}` : ""}.`,
    "",
    `You are working on the ${section} section, which sits under the ${pillar.label} pillar: ${pillar.territory}.`,
    `It runs to about ${pages} ${pages === 1 ? "page" : "pages"}, so aim for roughly ${target} to ${target + 250} words.`,
    "",
    "THE VOICE",
    typeof rules.voice === "string" ? String(rules.voice) : "Warm, curious and human.",
    "Lead with the story, the person, the place, the discovery. Start in the middle of something happening, not with context.",
    "The magazine is never the hero. The story is, and the person in it is.",
    "Earn every paragraph. If it does not move the story forward, cut it.",
    "End with something the reader carries, a feeling rather than a summary or a moral.",
    "Write tight, not thin. Tight means no wasted words. Thin means the meaning went with them.",
    "",
    "HARD RULES, these are not style preferences",
    "Never invent a fact, a date, a number, a quote or a name. If you need something you were not given, write the sentence without it and say so in your note. A magazine printing something you made up about a real person is the worst thing that can happen here.",
  ];

  if (rules.noEmDashes) {
    lines.push("Never use an em dash or an en dash. Use a comma, a full stop, or rewrite the sentence. This is checked automatically and an article containing one cannot be approved.");
  }
  if (rules.noExclamationMarks) {
    lines.push("Never use an exclamation mark. If a sentence needs one to feel exciting, it is not exciting enough. Rewrite it.");
  }
  if (rules.noSentenceStartingWithI) {
    lines.push('Never begin a sentence with the word "I".');
  }
  if (rules.southAfricanEnglish) {
    lines.push("South African English throughout. Colour not color, realise not realize, programme not program. South African reference points and idiom.");
  }
  if (banned.length) {
    lines.push(`Never use these words and phrases: ${banned.join(", ")}.`);
  }
  if (never.length) {
    lines.push(`The magazine does not carry: ${never.join(", ")}.`);
  }

  lines.push(
    "",
    "WHAT YOU RETURN",
    "Reply with JSON only. No prose around it, no code fences.",
    "",
    "{",
    '  "note": "what you did, what you need from the editor, anything you were not sure about",',
    '  "kicker": "the small label above the headline, a few words",',
    '  "headline": "the first line of the headline",',
    '  "headlineTurn": "the second line, which prints in the accent colour, or an empty string",',
    '  "standfirst": "one or two sentences under the headline",',
    '  "blocks": [',
    '    {"type": "p", "text": "a paragraph"},',
    '    {"type": "subhead", "text": "A subheading"},',
    '    {"type": "pullquote", "text": "a sentence lifted from the piece"},',
    '    {"type": "image", "where": "hero", "what": "what the picture should show"}',
    "  ]",
    "}",
    "",
    "Use subheadings to break anything longer than about six paragraphs.",
    "Use one pull quote for every two pages, lifted from the text rather than written for the purpose.",
    'Mark where a photograph belongs with an image block. "where" is one of: hero, inline, closing.',
    "You are composing, not laying out. Do not mention page numbers, page breaks or where anything falls on a page. That is decided by measurement after you are done."
  );

  return lines.join("\n");
}

/** A4 at 300dpi, and the text column inside it, in pixels. */
const PAGE_W_PX = 2480;
const COLUMN_W_PX = 2150;

/**
 * The size a picture should be supplied at, for the slot it is going into.
 *
 * Computed here rather than asked of the model. The page is a fixed
 * physical object and the model has no idea how wide a column is, so a size
 * it invented would be a number that looks authoritative and is wrong.
 */
function sizeFor(where: string): { widthPx: number; heightPx: number } {
  switch (where) {
    case "hero":
      // Full bleed across the page, 90mm deep by default.
      return { widthPx: PAGE_W_PX, heightPx: 1063 };
    case "closing":
      return { widthPx: COLUMN_W_PX, heightPx: 1200 };
    default:
      // An inline picture at about half the column, in a 4 to 3 shape.
      return { widthPx: 1080, heightPx: 810 };
  }
}

type RawBlock = { type: string; text?: string; where?: string; what?: string };

/**
 * Turns the model's reply into blocks the renderer already knows.
 *
 * Anything unrecognised is dropped rather than guessed at. A block type the
 * templates cannot draw is how a page ends up broken, and the whole reason
 * the block list is closed in the first place.
 */
function toBlocks(raw: RawBlock[]): { blocks: Block[]; imagesNeeded: CoEditorDraft["imagesNeeded"] } {
  const blocks: Block[] = [];
  const imagesNeeded: CoEditorDraft["imagesNeeded"] = [];

  for (const item of raw ?? []) {
    if (item.type === "p" && item.text) {
      blocks.push({ type: "p", content: { text: item.text } });
    } else if (item.type === "subhead" && item.text) {
      blocks.push({ type: "subhead", text: item.text });
    } else if (item.type === "pullquote" && item.text) {
      blocks.push({ type: "pullquote", content: { text: item.text }, tone: "orange" });
    } else if (item.type === "image") {
      const where = item.where ?? "inline";
      const size = sizeFor(where);
      imagesNeeded.push({ where, what: item.what ?? "A photograph", ...size });
      // A figure with no picture yet. It holds its place in the article and
      // renders as nothing until something is chosen for it.
      if (where !== "hero") blocks.push({ type: "figure", assetId: "" });
    }
  }

  return { blocks, imagesNeeded };
}

/**
 * Strips the code fence the model adds even when told not to.
 *
 * It does this often enough that parsing without allowing for it is a
 * guaranteed intermittent failure rather than a possible one.
 */
function unfence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

export async function draftWithCoEditor(
  system: string,
  turns: CoEditorTurn[]
): Promise<CoEditorDraft> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("The co-editor is not switched on: there is no API key configured.");
  }

  const anthropic = new Anthropic({ apiKey });

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system,
    messages: turns.map((t) => ({ role: t.role, content: t.content })),
  });

  const text = message.content
    .filter((part): part is Anthropic.TextBlock => part.type === "text")
    .map((part) => part.text)
    .join("");

  let parsed: {
    note?: string;
    kicker?: string;
    headline?: string;
    headlineTurn?: string;
    standfirst?: string;
    blocks?: RawBlock[];
  };

  try {
    parsed = JSON.parse(unfence(text));
  } catch {
    throw new Error(
      "The co-editor replied with something that was not a draft. Try asking again, and say what you want more plainly."
    );
  }

  const { blocks, imagesNeeded } = toBlocks(parsed.blocks ?? []);

  return {
    note: parsed.note ?? "",
    kicker: parsed.kicker ?? "",
    headline: parsed.headline ?? "",
    headlineTurn: parsed.headlineTurn ?? "",
    standfirst: parsed.standfirst ?? "",
    blocks,
    imagesNeeded,
  };
}

/** The opener the draft implies, ready to drop into the editor. */
export function draftOpener(draft: CoEditorDraft, existing: Opener): Opener {
  return {
    ...existing,
    kicker: draft.kicker || existing.kicker,
    headline: draft.headline || existing.headline,
    headlineTurn: draft.headlineTurn || undefined,
    standfirst: draft.standfirst ? { text: draft.standfirst } : existing.standfirst,
  };
}
