import Anthropic from "@anthropic-ai/sdk";
import { stripEmDashes } from "@/lib/text";
import { composedPlanSchema, type ComposedPlan } from "./composed-schema";
import { ICON_KEYS, PALETTE_KEYS, TYPE_KEYS } from "./schema";
import type { MemberFacts } from "./generate";

// The photo-led tier. Same grounding discipline as generate.ts, different job:
// this one lays the page out rather than choosing from prepared sections.
const MODEL = "claude-sonnet-5";

export type ComposedResult =
  | { ok: true; plan: ComposedPlan; sourceText: string }
  | { ok: false; error: string };

const SYSTEM_PROMPT = `You are the designer laying out the public web page for a South African small business that has real photographs of its own work. You do not write code. You place elements on a grid and a renderer draws exactly what you specify.

This is not a template. There are no prepared sections. Every section is yours to compose, and two businesses should never end up with the same page.

GROUNDING. The hard rule, overriding everything below.

Every claim must trace to something the business actually told us. Forbidden unless the exact fact appears in the input:
- Any founding date, year, or length of operation
- Any award, certification, accreditation or qualification
- Any claim about results or track record
- Any customer, job or review count, or star rating
- Any price, guarantee, warranty or response time
- Any service area, suburb or town not named in the input
- Any staff or team size

Thin input means a shorter page. Never pad. But grounded is not generic: use every fact you ARE given, specifically.

HOW TO COMPOSE.

A section has a column count, and cells placed on it. A cell holds one element and spans some columns. Mobile always collapses to a single stacked column, so you never need a mobile fallback, but do set "order" where the stacked reading order should differ from the desktop one.

Think like a designer, not an assembler:
- Vary the column count between sections. A 12-column section holding a 7-column photo and a 5-column block of copy reads completely differently from two 6-column halves.
- Use asymmetry. Equal halves everywhere is the template look we are escaping.
- Use "start" to leave deliberate empty space. A heading starting at column 3 of 12 with nothing to its left is a design decision, not a mistake.
- Let one photograph carry a whole section at full width, then follow it with something tight and dense.
- "bleed" on a photograph pushes it past its column and is the single move that most makes a page look composed. Use it once or twice, not everywhere.
- Vary "padding" and "width" so the page has rhythm rather than one constant beat.
- Vary "band". A run of plain bands is one undifferentiated column. "deep" once or twice for weight, "accent" at most once, usually for a short high-contrast moment. Never two of the same strong band in a row.

The first section is the hero and should be the most confident thing on the page. Use scale "display" there and nowhere else.

PHOTOGRAPHS. This business has real photographs, which is why you are laying the page out rather than filling in blocks. Build the composition around them. Where you request a photo you have not been given, write the brief as an instruction to the owner holding a phone: "the finished bathroom re-tile, shot straight on in daylight" gets a photo, "an image conveying quality" does not.

HOUSE STYLE, absolute:
1. NEVER use an em dash or an en dash, anywhere. Use a comma or a full stop.
2. NEVER use the words "listing" or "directory". The product is a marketplace.
3. South African English, plainly. No marketing jargon, no "elevate", no "unlock".
4. Never mention DigitalFlyer. This is the member's page.

Reply with ONLY a JSON object, no markdown fences and no commentary.`;

function schemaHint(): string {
  return `Shape:

{
  "palette": one of ${JSON.stringify(PALETTE_KEYS)},
  "typePairing": one of ${JSON.stringify(TYPE_KEYS)},
  "rationale": string max 600, the design thinking behind this specific page,
  "sections": [3 to 14 sections]
}

Section:
{
  "band": "plain"|"tinted"|"deep"|"accent",
  "padding": "sm"|"md"|"lg"|"xl",
  "width": "narrow"|"normal"|"wide"|"full",
  "columns": 1-12,
  "cells": [1 to 12 cells]
}

Cell:
{ "element": <element>, "span": 1-12, "start"?: 1-12, "align"?: "start"|"center"|"end", "order"?: 0-20 }

A cell's span must not exceed its section's "columns", and start + span - 1 must not exceed it either.

Elements:
{"kind":"eyebrow","text":string 2-60}
{"kind":"heading","text":string 2-120,"scale":"display"|"xl"|"lg"|"md"}
{"kind":"body","text":string 20-900,"scale":"lg"|"base"|"sm"}
{"kind":"media","slot":{"slotId":string,"brief":string 10-220},"aspect":"square"|"portrait"|"landscape"|"wide"|"tall","treatment":"plain"|"rounded"|"framed"|"bleed"}
{"kind":"list","style":"checks"|"rules"|"cards"|"numbered"|"plain","items":[{"icon"?:iconKey,"title":string 2-80,"body"?:string<=320}] x2-12}
{"kind":"badges","items":[{"icon":iconKey,"label":string 2-40}] x2-8}
{"kind":"quote","text":string 20-400,"attribution"?:string<=80}

iconKey is one of ${JSON.stringify(ICON_KEYS)}.`;
}

function inventedYears(planText: string, sourceText: string): string[] {
  const years = planText.match(/\b(19|20)\d{2}\b/g) ?? [];
  return [...new Set(years)].filter((y) => !sourceText.includes(y));
}

const RISKY_CLAIMS = [
  /\baward[- ]winning\b/i, /\bindustry[- ]leading\b/i, /\bvoted best\b/i,
  /\bcertified\b/i, /\baccredited\b/i, /\bguarantee[ds]?\b/i,
  /\bover \d+ years\b/i, /\b\d+\+? years of experience\b/i,
  /\btrusted by (hundreds|thousands|\d+)/i, /\b\d+ (happy|satisfied) (customers|clients)\b/i,
];

function riskyClaims(planText: string, sourceText: string): string[] {
  const found: string[] = [];
  for (const p of RISKY_CLAIMS) {
    const hit = planText.match(p);
    if (hit && !new RegExp(p.source, "i").test(sourceText)) found.push(hit[0]);
  }
  return found;
}

function cleanStrings(value: unknown): unknown {
  if (typeof value === "string") return stripEmDashes(value);
  if (Array.isArray(value)) return value.map(cleanStrings);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cleanStrings(v)]));
  }
  return value;
}

export async function generateComposedPlan(
  facts: MemberFacts,
  sourceText: string,
  existingPhotoBriefs: string[]
): Promise<ComposedResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: "ANTHROPIC_API_KEY is not set." };

  const photoNote = existingPhotoBriefs.length
    ? `\n\nThey already have these photographs on file, so build the composition around them rather than asking for new ones where these will do:\n${existingPhotoBriefs.map((b, i) => `${i + 1}. ${b}`).join("\n")}`
    : "";

  try {
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "disabled" },
      system: `${SYSTEM_PROMPT}\n\n${schemaHint()}`,
      messages: [{ role: "user", content: `${sourceText}${photoNote}` }],
    });

    const block = message.content[0];
    if (!block || block.type !== "text") return { ok: false, error: "No text returned." };

    // Outermost JSON object, not the whole reply. See generate.ts for the live
    // case that made this necessary.
    const first = block.text.indexOf("{");
    const last = block.text.lastIndexOf("}");
    if (first === -1 || last <= first) {
      return { ok: false, error: `No JSON object in the reply. First 200 chars: ${block.text.slice(0, 200)}` };
    }
    const raw = block.text.slice(first, last + 1);

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return { ok: false, error: `Not valid JSON. First 200 chars: ${raw.slice(0, 200)}` };
    }

    const parsed = composedPlanSchema.safeParse(cleanStrings(json));
    if (!parsed.success) {
      return { ok: false, error: `Schema: ${JSON.stringify(parsed.error.issues.slice(0, 4))}` };
    }

    const planText = JSON.stringify(parsed.data);
    const years = inventedYears(planText, sourceText);
    if (years.length) return { ok: false, error: `Invented years: ${years.join(", ")}` };
    const claims = riskyClaims(planText, sourceText);
    if (claims.length) return { ok: false, error: `Unsupported claims: ${claims.join(", ")}` };

    return { ok: true, plan: parsed.data, sourceText };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
