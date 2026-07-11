import type { MetadataRoute } from "next";

// Next.js special file — serves this at /robots.txt automatically. Private,
// signed-in-only routes are also excluded via a per-page noindex meta tag
// (the reliable mechanism, since not every crawler respects robots.txt) —
// this file is the crawl-budget hint on top of that, not the only line of
// defense.
export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://df-growth.vercel.app";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/onboard", "/admin", "/api", "/preview"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
