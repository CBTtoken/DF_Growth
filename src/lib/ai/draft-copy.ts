import Anthropic from "@anthropic-ai/sdk";

// Haiku 4.5 was tested live against real client input and fabricated facts
// twice in the same session despite an explicit "never invent claims"
// instruction (invented "since 1998" for a business that never mentioned a
// founding date, and "we've developed world-champion athletes" for a gym
// that never claimed any track record). Sonnet follows instructions more
// reliably; worth the extra cost here since this is a trust/safety issue
// (a real business making false claims to its own customers), not just a
// copy-quality one. The programmatic year-check below is a second, cheaper
// line of defense on top of this, not a replacement for it.
const MODEL = "claude-sonnet-5";

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

// Any 4-digit year in the output that doesn't appear anywhere in the
// client's own input is treated as a fabricated founding date / track
// record and fails the whole draft — cheap, reliable, and catches the
// exact failure mode observed in testing regardless of prompt wording.
function containsInventedYear(output: DraftOutput, sourceText: string): boolean {
  const outputText = `${output.headline} ${output.subheadline} ${output.aboutText} ${output.servicesText}`;
  const years = outputText.match(/\b(19|20)\d{2}\b/g) ?? [];
  return years.some((year) => !sourceText.includes(year));
}

// Best-effort: onboarding must never break because of this. Every call site
// treats a `null` return as "leave the Landing Copy step blank, the client
// writes their own" — the same behavior as before this feature existed.
export async function generateLandingCopy(input: DraftInput): Promise<DraftOutput | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const sourceText = [
    input.businessName,
    input.industry,
    input.province,
    input.businessDescription,
    input.tagline,
    input.productsServices,
    input.additionalNotes,
  ].join("\n");

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      // Sonnet 5 returns an extended-thinking block by default, which isn't
      // useful for short copywriting and — found live — can consume the
      // entire max_tokens budget on its own, leaving zero room for the
      // actual JSON output. Disabled outright rather than just budgeted.
      thinking: { type: "disabled" },
      system:
        "You write landing page copy for South African small businesses, grounded " +
        "strictly and only in the facts you're given below. This is a hard rule, not " +
        "a style preference: a business could face real reputational or legal harm " +
        "from a false claim on its own page, so getting this wrong is worse than " +
        "writing something plain.\n\n" +
        "Absolutely forbidden unless the exact fact appears in the input text:\n" +
        "- Any founding date, year, or duration of operation (\"since 20XX\", " +
        "\"X years of experience\", \"established in...\", \"a decade of...\")\n" +
        "- Any award, certification, accreditation, or qualification\n" +
        "- Any claim about past results, achievements, or track record " +
        "(\"award-winning\", \"champion\", \"industry-leading\", \"trusted by...\", " +
        "\"developed champions\", \"voted best...\")\n" +
        "- Any customer count, review count, or star rating\n" +
        "- Any service area not explicitly named in the input\n\n" +
        "If no products/services list is given, leave servicesText as an empty " +
        "string — some businesses (a consultant, a single-service contractor) just " +
        "want people to get in touch, and don't have a list to invent one for.\n\n" +
        "None of this means the copy should be thin. Grounded is not the same as " +
        "generic: every fact you ARE given (industry, province, area, what they " +
        "actually do day to day, who it's for, what makes their approach different) " +
        "should be used, specifically, not summarized away into a vague sentence. " +
        "Compare a weak version — 'We provide quality plumbing services in " +
        "Pretoria' — against a strong version that does the same job with the same " +
        "facts: 'Based in Pretoria, we handle everything from burst geysers to full " +
        "bathroom re-piping, with someone who actually answers the phone when you " +
        "call.' The strong version isn't longer because it invented anything — it's " +
        "longer because it USED what it was given instead of compressing it into a " +
        "generic label. aboutText specifically should read like a real paragraph a " +
        "business owner would be proud to have written about themselves: 3-5 " +
        "sentences, specific, warm, addressed to the customer reading it (\"you\"), " +
        "not a two-line stub. If the input truly is just one or two words (e.g. " +
        "\"plumber\" with no description at all), it's fine to stay shorter — the " +
        "floor is 'don't invent facts to sound impressive', not 'always write the " +
        "minimum possible'.\n\n" +
        "If the input is sparse, the correct response restates and polishes what " +
        "was actually said — not padded with invented specifics to sound more " +
        "impressive. A short honest headline beats a longer one with a made-up " +
        "detail. But 'sparse input' and 'thin output' are not the same axis: even " +
        "modest input usually contains enough (industry + area + who it's for) to " +
        "write a real paragraph, not just a slogan restated as a sentence.\n\n" +
        "The client's own tagline, if given, is displayed separately elsewhere on " +
        "the page — the headline must say something DIFFERENT from the tagline, " +
        "not repeat it verbatim or with only capitalization changed. Synthesize the " +
        "headline from what the business actually does (industry/description/" +
        "products), not by echoing the tagline back.\n\n" +
        "Reply with ONLY a JSON object, no markdown fences, no commentary, matching " +
        "exactly this shape: " +
        '{"headline": string (max 60 chars), "subheadline": string (max 160 chars), ' +
        '"aboutText": string (3-5 sentences, specific and detailed per the guidance ' +
        "above — do not default to 2 sentences when the input supports more, but " +
        'keep the total under 700 characters so it isn\'t cut off), ' +
        '"servicesText": string (each service on its own line, short phrases, no ' +
        "bullets or numbering)}.",
      messages: [
        {
          role: "user",
          content: [
            `Business name: ${input.businessName}`,
            `Industry: ${input.industry}`,
            `Province: ${input.province}`,
            `Description (in the owner's own words): ${input.businessDescription}`,
            input.tagline ? `Tagline: ${input.tagline}` : null,
            input.productsServices ? `Products/services: ${input.productsServices}` : null,
            input.additionalNotes ? `Additional notes: ${input.additionalNotes}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });

    // Don't assume content[0] is the text block — a thinking block (even
    // with thinking disabled, other block types are possible) can come
    // first, which is exactly what silently broke this the first time.
    const block = message.content.find((b) => b.type === "text");
    if (!block) return null;

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

    const draft: DraftOutput = {
      headline: parsed.headline.slice(0, 80),
      subheadline: parsed.subheadline.slice(0, 160),
      // 800, not 700 (the prompt's own target) — headroom so an over-length
      // response still gets cut at a word-ish boundary instead of exactly at
      // the model's own target, which was truncating mid-word in testing.
      aboutText: parsed.aboutText.slice(0, 800),
      servicesText: parsed.servicesText.slice(0, 600),
    };

    if (containsInventedYear(draft, sourceText)) {
      console.error("AI landing copy draft rejected: contains a year not present in the input", draft);
      return null;
    }

    return draft;
  } catch (err) {
    console.error("AI landing copy draft failed", err);
    return null;
  }
}
