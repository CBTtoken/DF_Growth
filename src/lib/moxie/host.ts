/**
 * Moxie Magazine's hostname and path helpers.
 *
 * Deliberately shaped like src/lib/bizup/product.ts's isKatisoBizHost and
 * katisoPath. Moxie is the third product to share this application, and the
 * KatisoBiz branch already paid for the lesson these two functions encode:
 * when the proxy and the link builder disagree about which host a request
 * arrived on, every internal link carries a redundant prefix that then
 * bounces through a redirect.
 */

/** The path prefix Moxie's routes live under inside this application. */
export const MOXIE_PREFIX = "/moxie";

/** Moxie's own domain. Every canonical URL points here, on every hostname. */
export const MOXIE_ORIGIN = "https://moxiemag.co.za";

/**
 * Smart Value Club, Moxie's parent brand.
 *
 * A separate business on a separate domain, so every mention of it on this
 * site links out. Held here rather than typed into three pages, because a
 * URL repeated by hand in three places is a URL that is wrong in one of
 * them within a year.
 */
export const SVC_URL = "https://smartvalueclub.co.za/";

/**
 * Whether a request arrived on one of Moxie's own hostnames.
 *
 * Matched on the first label, exactly as src/proxy.ts does, so the two
 * cannot disagree about which host is Moxie. www is the one case a first
 * label cannot express, so it stays explicit, the same way
 * www.katisobiz.co.za does.
 */
export function isMoxieHost(host: string | null): boolean {
  if (!host) return false;
  const bare = host.split(":")[0].toLowerCase();
  const firstLabel = bare.split(".")[0];
  return firstLabel === "moxiemag" || bare === "www.moxiemag.co.za";
}

/**
 * Builds a link to a Moxie page that is correct on whichever hostname the
 * current request arrived on.
 *
 * On moxiemag.co.za the prefix is what the proxy strips, so a link must not
 * carry it: moxiePath("/subscribe") gives "/subscribe". On the Growth
 * hostname and on Vercel preview deployments the prefix is what makes the
 * route reachable at all, so the same call gives "/moxie/subscribe".
 *
 * Both have to work. The site is built and reviewed on a preview URL long
 * before the domain's DNS is switched, and a link that only works after the
 * switch cannot be tested before it.
 *
 * Pass the clean path, always with a leading slash: moxiePath("/subscribe").
 */
export async function moxiePath(path: string): Promise<string> {
  const { headers } = await import("next/headers");
  const host = (await headers()).get("host") ?? "";
  if (isMoxieHost(host)) return path;
  return path === "/" ? MOXIE_PREFIX : `${MOXIE_PREFIX}${path}`;
}

/**
 * The canonical URL for a Moxie page, always on moxiemag.co.za and always
 * without the internal prefix.
 *
 * This is the whole answer to Moxie being reachable on more than one
 * hostname while the DNS is still being set up. The preview deployment and
 * the Growth hostname both serve these pages, and without a canonical tag
 * that would be the same content on three domains with nothing to say which
 * one counts. The old WordPress site is already indexed, so the risk here is
 * not a missed opportunity, it is splitting ranking that already exists.
 */
export function moxieCanonical(path: string): string {
  return path === "/" ? MOXIE_ORIGIN : `${MOXIE_ORIGIN}${path}`;
}
