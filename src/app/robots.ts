import type { MetadataRoute } from "next";

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
export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://df-growth.vercel.app";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/preview"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
