import type { MetadataRoute } from "next";
import { isKatisoBizHost } from "@/lib/bizup/product";
import { isMoxieHost } from "@/lib/moxie/host";
import { isJobsHost } from "@/lib/jobs/host";

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

  // The Desk's hostname is not a public site and has no sitemap. Every page
  // there already answers with an X-Robots-Tag, which is what actually keeps
  // it out of an index; this just means a crawler that somehow reaches the
  // host is told to leave before it asks for a page.
  if (bare.split(".")[0] === "desk") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  // Moxie is the opposite case to The Desk, and the reason this branch is
  // written out rather than falling through to the default below: the
  // WordPress site it replaces returns index, follow today and has been
  // indexed for months. Reaching the default would hand moxiemag.co.za a
  // sitemap listing Growth's pages, on a domain where none of them exist.
  //
  // Nothing is disallowed. The reader and account pages are protected by
  // server-side auth, and listing them here would only advertise that they
  // are worth looking at, which is the same reasoning the note above records
  // for /admin and /dashboard.
  if (isMoxieHost(host)) {
    return {
      rules: { userAgent: "*", allow: "/" },
      sitemap: `https://${bare}/sitemap.xml`,
    };
  }

  // KatisoBiz Jobs is on its own subdomain (jobs.katisobiz.co.za), not
  // matched by isKatisoBizHost (that checks the "katisobiz"/"bizup" first
  // label, not "jobs") -- without this branch it would fall through to the
  // generic case below and its sitemap link would point at the Growth
  // domain, exactly the bug the Moxie branch above exists to avoid.
  if (isJobsHost(host)) {
    return {
      rules: { userAgent: "*", allow: "/", disallow: ["/cv"] },
      sitemap: `https://${bare}/sitemap.xml`,
    };
  }

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
