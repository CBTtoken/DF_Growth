import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-haiku-4-5-20251001";

type DraftInput = {
  businessName: string;
  industry: string;
  province: string;
  businessDescription: string;
  tagline: string;
  productsServices: string;
  additionalNotes: string;
};

type DraftOutput = {
  headline: string;
  subheadline: string;
  aboutText: string;
  servicesText: string;
};

// Best-effort: onboarding must never break because of this. Every call site
// treats a `null` return as "leave the Landing Copy step blank, the client
// writes their own" — the same behavior as before this feature existed.
export async function generateLandingCopy(input: DraftInput): Promise<DraftOutput | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system:
        "You write landing page copy for South African small businesses. " +
        "Only elaborate on the facts you're given — never invent claims " +
        "(no fabricated awards, years in business, service areas, credentials, " +
        "or customer counts). If the input is sparse, keep the output short " +
        "rather than padding it with invented detail. Reply with ONLY a JSON " +
        "object, no markdown fences, no commentary, matching exactly this shape: " +
        '{"headline": string (max 60 chars), "subheadline": string (max 160 chars), ' +
        '"aboutText": string (2-3 sentences), "servicesText": string (each service ' +
        "on its own line, short phrases, no bullets or numbering)}.",
      messages: [
        {
          role: "user",
          content: [
            `Business name: ${input.businessName}`,
            `Industry: ${input.industry}`,
            `Province: ${input.province}`,
            `Description (in the owner's own words): ${input.businessDescription}`,
            input.tagline ? `Tagline: ${input.tagline}` : null,
            `Products/services: ${input.productsServices}`,
            input.additionalNotes ? `Additional notes: ${input.additionalNotes}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== "text") return null;

    // Despite the system prompt saying not to, Claude sometimes wraps the
    // JSON in a markdown code fence (```json ... ```) — strip it if present.
    const jsonText = block.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(jsonText);
    if (
      typeof parsed.headline !== "string" ||
      typeof parsed.subheadline !== "string" ||
      typeof parsed.aboutText !== "string" ||
      typeof parsed.servicesText !== "string"
    ) {
      return null;
    }

    return {
      headline: parsed.headline.slice(0, 80),
      subheadline: parsed.subheadline.slice(0, 160),
      aboutText: parsed.aboutText.slice(0, 600),
      servicesText: parsed.servicesText.slice(0, 600),
    };
  } catch (err) {
    console.error("AI landing copy draft failed", err);
    return null;
  }
}
