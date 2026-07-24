// Real screenshots of real client pages, for marketing use ("See It In
// Action") — a raw uploaded gallery photo isn't a screenshot of the page,
// and manual screenshotting doesn't scale. A managed API instead of a
// self-hosted headless browser: running real Chromium inside a Vercel
// serverless function is fragile (binary size, cold starts, memory) for
// what amounts to a handful of captures a week. Verified real pricing at
// screenshotone.com/pricing, 2026-07-24: free for up to 100/month, no
// card required; $17/month for 2,000/month after that.
const SCREENSHOTONE_ENDPOINT = "https://api.screenshotone.com/take";

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

  const res = await fetch(`${SCREENSHOTONE_ENDPOINT}?${params.toString()}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("captureScreenshot: request failed", url, res.status, body);
    return null;
  }

  return Buffer.from(await res.arrayBuffer());
}
