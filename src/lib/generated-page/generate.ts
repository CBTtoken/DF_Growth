import Anthropic from "@anthropic-ai/sdk";
import { stripEmDashes } from "@/lib/text";
import { pagePlanSchema, type PagePlan, ICON_KEYS, PALETTE_KEYS, TYPE_KEYS } from "./schema";

// Sonnet, not Haiku, for the same reason draft-copy.ts settled on it: Haiku
// was tested live against real member input and fabricated facts twice in one
// session, inventing "since 1998" for a business that never gave a founding
// date and "world-champion athletes" for a gym with no such claim. This
// generator produces roughly ten times more content than draft-copy does, so
// it carries ten times that exposure. A real business making a false claim on
// its own page is a trust and legal problem, not a copy-quality one.
const MODEL = "claude-sonnet-5";

export type MemberFacts = {
  businessName: string;
  industry: string | null;
  city: string | null;
  province: string | null;
  businessDescription: string | null;
  tagline: string | null;
  productsServices: string | null;
  additionalNotes: string | null;
  hasLogo: boolean;
  photoCount: number;
};

export type GenerateResult =
  | { ok: true; plan: PagePlan; sourceText: string }
  | { ok: false; error: string };

function factsToText(facts: MemberFacts): string {
  return [
    `Business name: ${facts.businessName}`,
    facts.industry ? `Trade or category: ${facts.industry}` : null,
    [facts.city, facts.province].filter(Boolean).length
      ? `Based in: ${[facts.city, facts.province].filter(Boolean).join(", ")}`
      : null,
    facts.tagline ? `Their own tagline: ${facts.tagline}` : null,
    facts.businessDescription ? `What they said about the business:\n${facts.businessDescription}` : null,
    facts.productsServices ? `Products and services they listed:\n${facts.productsServices}` : null,
    facts.additionalNotes ? `Anything else they told us:\n${facts.additionalNotes}` : null,
    `They have ${facts.photoCount} photograph${facts.photoCount === 1 ? "" : "s"} on file and ${facts.hasLogo ? "a logo" : "no logo"}.`,
  ]
    .filter(Boolean)
    .join("\n");
}

const SYSTEM_PROMPT = `You design the public web page for a South African small business, most often a one-person operation. You do not write code. You produce a structured plan that a component library renders.

Your job is the judgement a good designer makes in the first hour: which sections does THIS business actually need, in what order, and what goes in them. A plumber, a tattoo artist and a non-profit should come out looking and reading like three different organisations, because they are.

GROUNDING. This is the hard rule and it overrides everything below, including any instinct to make the page impressive.

Every single claim you write must trace to something the business actually told us. Absolutely forbidden unless the exact fact appears in the input:
- Any founding date, year, or length of operation ("since 2011", "over 10 years", "established", "a decade of")
- Any award, certification, accreditation, membership or qualification
- Any claim about results or track record ("award-winning", "trusted by hundreds", "industry-leading", "voted best")
- Any customer count, job count, review count or star rating
- Any price, guarantee, warranty or response time
- Any service area, suburb or town not named in the input
- Any staff or team size

If the business gave you thin input, the page is shorter. A short honest page beats a long one containing one invented detail. Never pad.

Grounded is not the same as generic. Use every fact you ARE given, specifically. "We provide quality plumbing services in Pretoria" wastes what you were told. "Burst geysers, blocked drains and full bathroom re-piping, across Pretoria" uses it. The difference is not invention, it is refusing to compress real detail into a vague label.

CHOOSING SECTIONS. You must start with a hero. After that, choose only sections this business can genuinely fill.
- "pillars" only where the business has a real framework or a small set of distinct things it does. Do not force four cards on a plumber who simply fixes things.
- "process" is what actually happens with THIS trade. A plumber's callout is not a tattoo consultation and neither is an NPO's intake. Never write generic steps like "get in touch, we do the work, you are happy". If you cannot say something specific to this trade, omit the section.
- "faq" only where you can answer from real facts. Good questions are the ones this trade's customers actually ask. Never invent a price or a turnaround time in an answer.
- "services" wants a real one-line description per service where the input supports one. A bare list of labels is what we are replacing.
- "notice" is for one genuinely important line the member actually stated, such as an emergency callout or a delivery area. Omit it if they stated nothing of the kind.
- "gallery" only if photographs would genuinely help this business. Trades and creative work yes, a consultant usually no. You may request photo slots even when they have none on file yet, because we ask them for exactly the photos you specify.
- "featureSplit" is for a single idea that deserves room, paired with one photograph.
- "ctaBand" goes last if you use it.

PHOTO BRIEFS. Where you request a photo, the brief is an instruction to the business owner, in plain language, about what to photograph. "A finished bathroom re-tile, taken in daylight" gets a photo. "An image representing quality" does not. Be concrete and be realistic about what a one-person business can take on a phone.

DESIGN. Choose the palette and heading font that suit this trade, not the one you like. A funeral director is not "bold-industrial". A tattoo studio is not "clean-clinical". Justify both in the rationale field.

HOUSE STYLE, absolute:
1. NEVER use an em dash or an en dash, anywhere, in any field. Use a comma or a full stop, or restructure. This is the single most common thing to get wrong.
2. NEVER use the words "listing" or "directory". The product is a marketplace.
3. Write South African English, plainly. No marketing jargon, no "elevate your", no "unlock".
4. Address the reader as "you" where it is natural.
5. Never mention DigitalFlyer on the page. This is the member's page, not ours.

Reply with ONLY a JSON object, no markdown fences and no commentary.`;

function schemaHint(): string {
  return `The JSON must match this shape exactly.

{
  "palette": one of ${JSON.stringify(PALETTE_KEYS)},
  "headingFont": one of ${JSON.stringify(TYPE_KEYS)},
  "rationale": string, max 600 chars, why you chose these sections, this palette and this font for this business,
  "sections": array of 3 to 12 section objects, the first of which MUST be the hero
}

Section objects, by "type":
{"type":"hero","eyebrow"?:string<=60,"headline":string<=90,"subheadline":string<=200,"photoSlot"?:{"slotId":string,"brief":string}}
{"type":"intro","heading":string<=90,"paragraphs":[string 40-700] x1-3}
{"type":"pillars","eyebrow"?:string,"heading":string<=90,"items":[{"icon":iconKey,"title":string<=60,"body":string 20-300}] x2-6}
{"type":"services","eyebrow"?:string,"heading":string<=90,"items":[{"name":string<=70,"description"?:string<=200}] x2-14}
{"type":"process","eyebrow"?:string,"heading":string<=90,"steps":[{"title":string<=60,"body":string 20-300}] x2-5}
{"type":"featureSplit","heading":string<=90,"body":string 40-600,"photoSlot"?:{"slotId":string,"brief":string},"mediaSide":"left"|"right"}
{"type":"faq","heading":string<=90,"items":[{"question":string<=160,"answer":string 20-600}] x2-8}
{"type":"gallery","heading":string<=90,"photoSlots":[{"slotId":string,"brief":string}] x2-8}
{"type":"notice","icon":iconKey,"text":string 10-180}
{"type":"ctaBand","heading":string<=90,"body"?:string<=300}

iconKey must be one of ${JSON.stringify(ICON_KEYS)}.`;
}

// Any 4-digit year in the output that does not appear in the member's own
// input is treated as a fabricated founding date and fails the whole plan.
// Carried over from draft-copy.ts, where it catches the exact failure mode
// observed live, cheaply and regardless of how the prompt is worded.
function inventedYears(planText: string, sourceText: string): string[] {
  const years = planText.match(/\b(19|20)\d{2}\b/g) ?? [];
  return [...new Set(years)].filter((year) => !sourceText.includes(year));
}

// A second cheap net for the claims the prompt forbids. Not a substitute for
// the model following instructions, a backstop for when it does not. Each of
// these is only a problem when the member never said it themselves, so the
// source text is always checked before failing.
const RISKY_CLAIMS = [
  /\baward[- ]winning\b/i,
  /\bindustry[- ]leading\b/i,
  /\bvoted best\b/i,
  /\bcertified\b/i,
  /\baccredited\b/i,
  /\bguarantee[ds]?\b/i,
  /\bover \d+ years\b/i,
  /\b\d+\+? years of experience\b/i,
  /\btrusted by (hundreds|thousands|\d+)/i,
  /\b\d+ (happy|satisfied) (customers|clients)\b/i,
];

function riskyClaims(planText: string, sourceText: string): string[] {
  const found: string[] = [];
  for (const pattern of RISKY_CLAIMS) {
    const hit = planText.match(pattern);
    if (hit && !new RegExp(pattern.source, "i").test(sourceText)) found.push(hit[0]);
  }
  return found;
}

// Recursively strip em dashes from every string in the plan. The prompt
// forbids them and the prompt's own prose contains none, but this is a
// standing house rule and a backstop costs nothing.
function cleanStrings(value: unknown): unknown {
  if (typeof value === "string") return stripEmDashes(value);
  if (Array.isArray(value)) return value.map(cleanStrings);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cleanStrings(v)]));
  }
  return value;
}

export async function generatePagePlan(facts: MemberFacts): Promise<GenerateResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: "ANTHROPIC_API_KEY is not set." };

  const sourceText = factsToText(facts);

  try {
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8000,
      // Same reason as draft-copy.ts: Sonnet returns an extended-thinking
      // block by default, which on a long structured output can eat the whole
      // token budget and leave no room for the JSON itself.
      thinking: { type: "disabled" },
      system: `${SYSTEM_PROMPT}\n\n${schemaHint()}`,
      messages: [{ role: "user", content: sourceText }],
    });

    const block = message.content[0];
    if (!block || block.type !== "text") return { ok: false, error: "No text returned." };

    // Strip markdown fences before parsing. The prompt says not to add them
    // and models add them anyway, which has bitten this codebase before.
    const raw = block.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      return { ok: false, error: `Response was not valid JSON. First 200 chars: ${raw.slice(0, 200)}` };
    }

    const cleaned = cleanStrings(parsedJson);
    const parsed = pagePlanSchema.safeParse(cleaned);
    if (!parsed.success) {
      return { ok: false, error: `Plan did not match the schema: ${JSON.stringify(parsed.error.issues.slice(0, 4))}` };
    }

    if (parsed.data.sections[0].type !== "hero") {
      return { ok: false, error: "Plan did not start with a hero section." };
    }

    const planText = JSON.stringify(parsed.data);

    const years = inventedYears(planText, sourceText);
    if (years.length > 0) {
      return { ok: false, error: `Plan invented years the member never gave: ${years.join(", ")}` };
    }

    const claims = riskyClaims(planText, sourceText);
    if (claims.length > 0) {
      return { ok: false, error: `Plan made unsupported claims: ${claims.join(", ")}` };
    }

    return { ok: true, plan: parsed.data, sourceText };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
