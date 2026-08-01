// Bringing an uploaded photograph down to the size a page can actually use.
//
// Dewald asked whether a 50MB upload is used as it arrives. It was, and that
// was a real defect rather than a missing nicety: Moxie's readers are
// predominantly on phones, and a thirty page edition carrying full sized
// camera files is a download nobody on a South African mobile connection
// will wait for.
//
// Done in the browser, before the upload, so it also cuts the upload itself
// from minutes to seconds on a slow connection. The original is not kept.
// That is a deliberate trade: keeping both doubles storage for a file that
// only ever gets used at page size, and the publisher still has the
// photograph on their own machine.

/** A4 at 300dpi is 2480 by 3508. A full bleed page never needs more. */
const MAX_EDGE = 3600;

/** Enough for a full page photograph without being visibly soft. */
const QUALITY = 0.86;

/**
 * Formats that are passed through untouched.
 *
 * A PDF is advertiser artwork and must not be re-encoded at all. A GIF may
 * be animated, and drawing it to a canvas would silently flatten it to the
 * first frame.
 */
const PASS_THROUGH = new Set(["application/pdf", "image/gif", "image/svg+xml"]);

export type Downscaled = {
  file: File | Blob;
  /** What to send as the content type. */
  contentType: string;
  /** For telling the publisher what happened. */
  before: number;
  after: number;
  resized: boolean;
};

export async function downscaleForPrint(file: File): Promise<Downscaled> {
  if (PASS_THROUGH.has(file.type)) {
    return { file, contentType: file.type, before: file.size, after: file.size, resized: false };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // A format the browser cannot decode, most often HEIC on a machine
    // without the codec. Passed through rather than refused: storage
    // accepts it, and a picture that arrives too large is better than one
    // that does not arrive.
    return { file, contentType: file.type, before: file.size, after: file.size, resized: false };
  }

  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1;

  // Already small enough, and re-encoding it would only lose quality for
  // nothing.
  if (scale === 1 && file.size < 3_000_000) {
    bitmap.close();
    return { file, contentType: file.type, before: file.size, after: file.size, resized: false };
  }

  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return { file, contentType: file.type, before: file.size, after: file.size, resized: false };
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // PNG keeps its transparency. A partner's logo on a coloured band would
  // otherwise gain a white box around it, which is exactly the kind of
  // thing nobody notices until it is printed.
  const keepPng = file.type === "image/png";
  const contentType = keepPng ? "image/png" : "image/jpeg";

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, contentType, keepPng ? undefined : QUALITY)
  );

  if (!blob || blob.size >= file.size) {
    // Re-encoding made it bigger, which happens with an already optimised
    // file. Keep whichever is smaller.
    return { file, contentType: file.type, before: file.size, after: file.size, resized: false };
  }

  return {
    file: blob,
    contentType,
    before: file.size,
    after: blob.size,
    resized: true,
  };
}

export function describeSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1000))}KB`;
}
