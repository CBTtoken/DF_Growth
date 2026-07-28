import type { MetadataRoute } from "next";
import { isKatisoBizHost } from "@/lib/bizup/product";

// Next.js special file — serves this at /robots.txt automatically.
//
// Public Beta Polish Sprint Sec 13.11: previously listed /admin, /dashboard,
// /onboard, and /api explicitly in disallow — a real problem, since
// robots.txt is a plain, publicly-fetchable file, and a disallow rule
// literally advertises "there's something at /admin worth hiding" to
// anyone reading it, attacker or not. Real protection was never this file
// anyway (per-page noindex meta tags are what actually keep these out of
// search results, since not every crawler even respects robots.txt) — the
// actual security boundary is server-side auth on each route, not
// obscuring the path list here. /preview stays listed since it's just a
// crawl-budget hint for low-value duplicate content, not a sensitive path.
export default async function robots(): Promise<MetadataRoute.Robots> {
  // Host-aware, because two products share this app and this file is
  // served on both. Pointing katisobiz.co.za at Growth's sitemap would
  // hand a crawler a list of pages on a different domain, which is worse
  // than having no sitemap at all.
  const { headers } = await import("next/headers");
  const host = (await headers()).get("host") ?? "";
  const bare = host.split(":")[0].toLowerCase();

  const siteUrl = isKatisoBizHost(host)
    ? `https://${bare}`
    : (process.env.NEXT_PUBLIC_SITE_URL ?? "https://df-growth.vercel.app");

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/preview"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
