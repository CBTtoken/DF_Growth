// Combined spec Sec 35: basic rate limiting for public-facing/abusable
// submission endpoints (signup, lead capture, AI copy drafting). In-memory
// rather than a Redis/Upstash-backed limiter — deliberately no new paid
// infra for what the spec itself frames as a "basic" ask. This resets on
// cold start and isn't shared across concurrent serverless instances,
// which is an accepted, documented tradeoff at this stage: it stops a
// single script/browser tab from hammering an endpoint in a tight loop
// (the actual threat here), even if it can't guarantee a hard global cap
// across every instance Vercel happens to spin up.
const buckets = new Map<string, { count: number; resetAt: number }>();

// Bounds the Map's growth in a long-lived warm instance — without this, a
// steady trickle of one-off visitors (each getting their own IP-keyed
// bucket that's never touched again) would accumulate forever.
let opsSinceSweep = 0;
const SWEEP_INTERVAL = 500;

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  opsSinceSweep++;
  if (opsSinceSweep > SWEEP_INTERVAL) {
    opsSinceSweep = 0;
    for (const [k, v] of buckets) {
      if (now > v.resetAt) buckets.delete(k);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count++;
  return bucket.count > limit;
}

// x-forwarded-for can carry a client-supplied chain ("client, proxy1,
// proxy2") — Vercel's edge network prepends the real client IP, so the
// first entry is the one worth keying on.
export function clientIpFromHeaders(h: Headers): string {
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip") ?? "unknown";
}
