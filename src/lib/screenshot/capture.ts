import { createHmac } from "node:crypto";

// Real screenshots of real client pages, for marketing use ("See It In
// Action") — a raw uploaded gallery photo isn't a screenshot of the page,
// and manual screenshotting doesn't scale. A managed API instead of a
// self-hosted headless browser: running real Chromium inside a Vercel
// serverless function is fragile (binary size, cold starts, memory) for
// what amounts to a handful of captures a week. Verified real pricing at
// screenshotone.com/pricing, 2026-07-24: free for up to 100/month, no
// card required; $17/month for 2,000/month after that.
const SCREENSHOTONE_ENDPOINT = "https://api.screenshotone.com/take";

// Verified at screenshotone.com/docs/signed-requests, 2026-07-24: signing
// is optional unless enforcement is turned on for the access key in
// ScreenshotOne's dashboard — but since a secret key exists, sign every
// request anyway rather than depend on that dashboard setting never
// changing. HMAC-SHA256 over the exact query string (access_key + the
// rest, unsorted, in insertion order — matches their own CLI example),
// hex digest appended as a `signature` param.
function signParams(params: URLSearchParams, secretKey: string): string {
  const signature = createHmac("sha256", secretKey).update(params.toString()).digest("hex");
  return signature;
}

export async function captureScreenshot(url: string): Promise<Buffer | null> {
  const accessKey = process.env.SCREENSHOTONE_ACCESS_KEY;
  if (!accessKey) {
    console.error("captureScreenshot: SCREENSHOTONE_ACCESS_KEY is not set");
    return null;
  }

  const params = new URLSearchParams({
    access_key: accessKey,
    url,
    viewport_width: "1280",
    viewport_height: "800",
    device_scale_factor: "1",
    format: "jpg",
    image_quality: "80",
    block_cookie_banners: "true",
    block_banners_by_heuristics: "true",
    block_ads: "true",
    cache: "false",
  });

  const secretKey = process.env.SCREENSHOTONE_SECRET_KEY;
  if (secretKey) {
    params.set("signature", signParams(params, secretKey));
  }

  const res = await fetch(`${SCREENSHOTONE_ENDPOINT}?${params.toString()}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("captureScreenshot: request failed", url, res.status, body);
    return null;
  }

  return Buffer.from(await res.arrayBuffer());
}
