import "server-only";
import sharp from "sharp";

// Server-only: sharp is a native Node module and must never end up in a
// client bundle. The cap that the client components need lives separately
// in lib/photos.ts for exactly that reason.

// The reference treatment from the Davemarly build script, now applied to
// every member photo instead of only the ones Dewald processes by hand.
// 1600px is comfortably larger than any slot a template renders and small
// enough to stay light on a phone data plan (the Build Kit's B2 rule).
const MAX_EDGE = 1600;
const JPEG_QUALITY = 82;

export type ProcessedPhoto = {
  data: Buffer;
  contentType: string;
  extension: string;
};

// Two jobs, and the first one is the one members notice: .rotate() with no
// argument applies the EXIF orientation tag and then strips it. Phone
// cameras record "this photo is sideways, rotate it when you display it"
// rather than rewriting the pixels, and Supabase storage serves the file
// back untouched, so a portrait photo taken on a phone was landing on a
// member's live page lying on its side. That was the single most visible
// difference between a self-serve page and a done-for-you one.
//
// Best effort by design: if sharp cannot read the format at all, the
// caller uploads the original bytes untouched, which is exactly what
// happened before this existed. A photo that arrives rotated is a bad
// page; a photo that fails to upload is no page at all.
export async function processMemberPhoto(input: Buffer): Promise<ProcessedPhoto | null> {
  try {
    const data = await sharp(input)
      .rotate()
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: "inside",
        // Never upscale: a small photo blown up to 1600px looks worse than
        // the original at its own size, and costs more to serve.
        withoutEnlargement: true,
      })
      // Photos, not logos, so flattening transparency onto white is the
      // right result for the one format that can carry it. Without this a
      // transparent PNG goes to JPEG with a black background.
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    return { data, contentType: "image/jpeg", extension: "jpg" };
  } catch (err) {
    console.error("Photo processing failed, falling back to the original file", err);
    return null;
  }
}
