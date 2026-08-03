/**
 * Smart Value Club's hostname and path helpers.
 *
 * Deliberately shaped like src/lib/moxie/host.ts, which is itself shaped
 * like src/lib/bizup/product.ts: when the proxy and the link builder
 * disagree about which host a request arrived on, every internal link
 * carries a redundant prefix that bounces through a redirect. Fourth
 * product, same two functions, zero new lessons.
 *
 * SVC and Moxie are one system on two domains (they spin out together),
 * but they are two brands with two palettes that never share a view, so
 * each keeps its own host module and its own theme.
 */

/** The path prefix SVC's routes live under inside this application. */
export const SVC_PREFIX = "/svc";

/** SVC's own domain. Every canonical URL points here, on every hostname. */
export const SVC_ORIGIN = "https://smartvalueclub.co.za";

/**
 * Whether a request arrived on one of SVC's own hostnames.
 *
 * Matched on the first label, exactly as src/proxy.ts does, so the two
 * cannot disagree. www is the one case a first label cannot express, so it
 * stays explicit.
 */
export function isSvcHost(host: string | null): boolean {
  if (!host) return false;
  const bare = host.split(":")[0].toLowerCase();
  const firstLabel = bare.split(".")[0];
  return firstLabel === "smartvalueclub" || bare === "www.smartvalueclub.co.za";
}

/**
 * Builds a link to an SVC page that is correct on whichever hostname the
 * current request arrived on.
 *
 * On smartvalueclub.co.za the prefix is what the proxy strips, so a link
 * must not carry it: svcPath("/packages") gives "/packages". On the Growth
 * hostname and on Vercel preview deployments the prefix is what makes the
 * route reachable at all, so the same call gives "/svc/packages". Both have
 * to work: the site is built and reviewed on a preview URL long before the
 * domain's DNS is switched.
 */
export async function svcPath(path: string): Promise<string> {
  const { headers } = await import("next/headers");
  const host = (await headers()).get("host") ?? "";
  if (isSvcHost(host)) return path;
  return path === "/" ? SVC_PREFIX : `${SVC_PREFIX}${path}`;
}

/**
 * The canonical URL for an SVC page, always on smartvalueclub.co.za and
 * always without the internal prefix.
 *
 * The current WordPress site is noindex site-wide, so unlike Moxie there is
 * no existing ranking to protect; the point here is the opposite regression.
 * Handoff section 3.3: every public page must return normal robots
 * directives, and the canonical tag is what stops the preview deployment
 * and the Growth hostname competing with the real domain once indexing
 * begins.
 */
export function svcCanonical(path: string): string {
  return path === "/" ? SVC_ORIGIN : `${SVC_ORIGIN}${path}`;
}

/**
 * Member-area paths under the SVC prefix. Everything here answers with a
 * noindex header on every hostname, including smartvalueclub.co.za itself
 * (handoff 3.3: member and admin routes stay noindex). Public marketing
 * pages are everything not listed here.
 */
export const SVC_PRIVATE_SEGMENTS = ["account", "join", "login", "welcome", "forgot-password", "reset-password", "auth", "admin"];

/** Whether a path inside the SVC prefix belongs to the private member area. */
export function isSvcPrivatePath(pathnameWithinSvc: string): boolean {
  const first = pathnameWithinSvc.replace(/^\//, "").split("/")[0];
  return SVC_PRIVATE_SEGMENTS.includes(first);
}
