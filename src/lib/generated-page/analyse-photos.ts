import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// Look at the member's actual photographs.
//
// This is the piece that was missing, and its absence is the whole reason a
// generated page could not match a hand-built one. The generator was being
// told "this member has 8 photographs" and nothing else, so it chose aspect
// ratios blind and photographs were mapped onto slots in upload order. When
// Buffelskop was built by hand, a human looked at every image and decided
// which one earns the hero, which is a tall bag shot that wants portrait, and
// where it is safe to crop. That judgement needs the picture.
//
// Runs once per photograph, at upload time in production. The result is stored
// alongside the image, so composing and recomposing a page costs nothing extra.

const MODEL = "claude-sonnet-5";

// Prose fields truncate rather than reject.
//
// This cost five of Buffelskop's eight photographs on the first run, and it
// was the third time in one session that a character cap silently threw away
// good output. A description running long is never a reason to discard an
// entire analysis of an image we have already paid to look at. Enums and
// structure are still strict, because those the renderer actually depends on.
const prose = (max: number) =>
  z.string().transform((v) => (v.length > max ? `${v.slice(0, max - 1).trimEnd()}…` : v));

export const photoAnalysisSchema = z.object({
  /** One plain sentence a person would recognise the photo from. */
  description: prose(220),
  /** What the photo is OF, in two or three words, for matching to sections. */
  subject: z.string().min(2).max(60),
  orientation: z.enum(["portrait", "landscape", "square"]),
  /** Where the subject sits, so a crop does not cut it in half. */
  focalPoint: z.enum(["centre", "top", "bottom", "left", "right", "top-left", "top-right", "bottom-left", "bottom-right"]),
  /** Aspect ratios this image can be shown at without ruining it. */
  safeAspects: z.array(z.enum(["square", "portrait", "landscape", "wide", "tall"])).min(1),
  /** Rough dominant colour, so a palette can be chosen that does not fight it. */
  dominantTone: z.enum(["warm", "cool", "neutral", "dark", "bright", "muted"]),
  /** Is this good enough to put on a business's public page. */
  quality: z.enum(["strong", "usable", "weak"]),
  /** Where this photo would do the most work. */
  bestUse: z.enum(["hero", "feature", "gallery", "detail", "avoid"]),
  /** Why, in one short line. Shown to the member if we reject a photo. */
  note: prose(200),
});

export type PhotoAnalysis = z.infer<typeof photoAnalysisSchema> & { photoId: string; url: string };

const SYSTEM = `You are looking at a photograph a South African small business uploaded for their own web page. Describe it so a page can be designed around it.

Be honest about quality. These are usually phone photographs taken by the business owner, not a studio shoot, and that is fine: "usable" is a perfectly good verdict. Reserve "weak" for genuinely unusable, meaning badly out of focus, very dark, cluttered beyond recognition, or a screenshot rather than a photograph. Reserve "avoid" for anything that would embarrass the business on its own page.

safeAspects is the important field. A tall photograph of a person forced into a wide banner gets their head cut off, and that single mistake is what makes a generated page look amateur. Only list ratios that genuinely work for this image. It is better to return one safe ratio than four risky ones.

bestUse: "hero" is reserved for a photograph strong enough to lead the page, which most are not. "detail" is a close-up that supports something else. "avoid" means do not put this on the page at all.

Reply with ONLY a JSON object, no markdown fences and no commentary:
{"description":string,"subject":string,"orientation":"portrait"|"landscape"|"square","focalPoint":"centre"|"top"|"bottom"|"left"|"right"|"top-left"|"top-right"|"bottom-left"|"bottom-right","safeAspects":["square"|"portrait"|"landscape"|"wide"|"tall"],"dominantTone":"warm"|"cool"|"neutral"|"dark"|"bright"|"muted","quality":"strong"|"usable"|"weak","bestUse":"hero"|"feature"|"gallery"|"detail"|"avoid","note":string}`;

export async function analysePhoto(photoId: string, url: string): Promise<PhotoAnalysis | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: "disabled" },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            // A URL source rather than base64: these are already public
            // Supabase storage URLs, so there is nothing to gain from pulling
            // every image through our own server first.
            { type: "image", source: { type: "url", url } },
            { type: "text", text: "Describe this photograph for page design." },
          ],
        },
      ],
    });

    const block = message.content[0];
    if (!block || block.type !== "text") {
      console.error("Photo analysis: no text block", photoId, message.stop_reason);
      return null;
    }

    const first = block.text.indexOf("{");
    const last = block.text.lastIndexOf("}");
    if (first === -1 || last <= first) {
      console.error("Photo analysis: no JSON", photoId, message.stop_reason, block.text.slice(0, 160));
      return null;
    }

    const parsed = photoAnalysisSchema.safeParse(JSON.parse(block.text.slice(first, last + 1)));
    if (!parsed.success) {
      console.error("Photo analysis: schema", photoId, JSON.stringify(parsed.error.issues.slice(0, 2)));
      return null;
    }

    return { ...parsed.data, photoId, url };
  } catch (err) {
    // Best effort, like every other external call in this codebase: a photo we
    // could not analyse is one the generator will not place, never a failed
    // page. But it is logged, because the first run silently dropped five of
    // Buffelskop's eight photographs and a bare `catch {}` gave nothing to
    // debug with.
    console.error("Photo analysis failed", photoId, err instanceof Error ? err.message : err);
    return null;
  }
}

// Concurrency is capped rather than firing every photograph at once. Kept as a
// courtesy to the API rather than because it fixed anything: the missing five
// photographs turned out to be schema rejections, not rate limits. Worth
// recording that I guessed rate limiting first and was wrong, which is why the
// null paths now log a reason.
const CONCURRENCY = 3;

export async function analysePhotos(photos: { photoId: string; url: string }[]): Promise<PhotoAnalysis[]> {
  const results: PhotoAnalysis[] = [];
  for (let i = 0; i < photos.length; i += CONCURRENCY) {
    const batch = photos.slice(i, i + CONCURRENCY);
    const settled = await Promise.all(batch.map((p) => analysePhoto(p.photoId, p.url)));
    results.push(...settled.filter((r): r is PhotoAnalysis => r !== null));
  }
  return results;
}

// What the page generator is told about the photographs it has to work with.
export function photosToPrompt(analyses: PhotoAnalysis[]): string {
  if (analyses.length === 0) return "";
  const usable = analyses.filter((a) => a.bestUse !== "avoid" && a.quality !== "weak");
  const rejected = analyses.filter((a) => a.bestUse === "avoid" || a.quality === "weak");

  const lines = usable.map(
    (a) =>
      `- id "${a.photoId}": ${a.description} Subject: ${a.subject}. Orientation: ${a.orientation}. Focal point: ${a.focalPoint}. Safe aspects: ${a.safeAspects.join(", ")}. Tone: ${a.dominantTone}. Best used as: ${a.bestUse}.`
  );

  return `\n\nTHE PHOTOGRAPHS YOU HAVE. Each is described from the actual image. Place them by id, and only ever at one of its safe aspects: forcing a photograph into a ratio it cannot take is the single thing that makes a page look amateur.\n${lines.join("\n")}${
    rejected.length
      ? `\n\nNot usable, do not place these: ${rejected.map((r) => `${r.photoId} (${r.note})`).join("; ")}`
      : ""
  }`;
}
