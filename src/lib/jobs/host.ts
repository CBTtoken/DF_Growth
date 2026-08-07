/**
 * KatisoBiz Jobs' hostname and path helpers.
 *
 * Shaped like src/lib/moxie/host.ts's isMoxieHost/moxiePath/moxieCanonical:
 * when the proxy and the link builder disagree about which host a request
 * arrived on, every internal link carries a redundant prefix that then
 * bounces through a redirect.
 */

/** The path prefix Jobs' routes live under inside this application. */
export const JOBS_PREFIX = "/jobs";

/** Jobs' own subdomain. Every canonical URL points here, on every hostname. */
export const JOBS_ORIGIN = "https://jobs.katisobiz.co.za";

/**
 * Whether a request arrived on Jobs' own hostname.
 *
 * Matched on the first label, exactly as src/proxy.ts does, so the two
 * cannot disagree about which host is Jobs. jobs.katisobiz.co.za's first
 * label is "jobs", not "katisobiz" -- distinct from the KatisoBiz branch,
 * checked separately so a jobs.* request is never swallowed by it.
 */
export function isJobsHost(host: string | null): boolean {
  if (!host) return false;
  const bare = host.split(":")[0].toLowerCase();
  const firstLabel = bare.split(".")[0];
  return firstLabel === "jobs";
}

/**
 * Builds a link to a Jobs page that is correct on whichever hostname the
 * current request arrived on.
 *
 * On jobs.katisobiz.co.za the prefix is what the proxy strips, so a link
 * must not carry it: jobsPath("/find-people") gives "/find-people". On the
 * Growth hostname and on Vercel preview deployments the prefix is what
 * makes the route reachable at all, so the same call gives
 * "/jobs/find-people".
 *
 * Pass the clean path, always with a leading slash.
 */
export async function jobsPath(path: string): Promise<string> {
  const { headers } = await import("next/headers");
  const host = (await headers()).get("host") ?? "";
  if (isJobsHost(host)) return path;
  return path === "/" ? JOBS_PREFIX : `${JOBS_PREFIX}${path}`;
}

/**
 * The canonical URL for a Jobs page, always on jobs.katisobiz.co.za and
 * always without the internal prefix. Jobs wants to be indexed from day
 * one (unlike The Desk), so every page needs one real canonical, not a
 * noindex header on every hostname but the real one.
 */
export function jobsCanonical(path: string): string {
  return path === "/" ? JOBS_ORIGIN : `${JOBS_ORIGIN}${path}`;
}
