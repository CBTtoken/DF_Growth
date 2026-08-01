import { NextResponse, type NextRequest } from "next/server";
import { isMoxieHost, MOXIE_PREFIX } from "@/lib/moxie/host";

// Agent Referral Programme, real agent feedback follow-up: personalized
// referral links live on their own subdomain (agent.digitalflyersa.co.za/
// losaan) rather than a path on the main site, so the link itself reads as
// dedicated to the agent, not another page of growth.digitalflyersa.co.za.
// This is the proxy (Next.js 16's rename of middleware) for the whole app.
// A request arriving on the agent subdomain is rewritten internally to the
// actual route handler (src/app/agent-link/[slug]/route.ts); the browser's
// address bar keeps showing the personalized URL throughout.
//
// It now also carries KatisoBiz's host routing, see below. Both branches are
// host-gated and every other hostname returns untouched, so the live
// Growth site is unaffected by construction rather than by the rewrite
// rules happening to be correct.
const BIZUP_PREFIX = "/bizup";

// Company-wide legal pages. These are one set of documents for the whole
// business, deliberately not one per product (Legal Pages Rebuild Brief
// Part 2.1: two privacy policies drift apart within a year, and a
// contradiction between two documents you published yourself is worse than
// either being imperfect).
//
// They therefore must not be rewritten into /bizup/... on KatisoBiz's
// hostnames, which is what was happening: the KatisoBiz footer links to
// /terms and /privacy and both returned 404 on katisobiz.co.za, because
// /bizup/terms does not exist and never should. Serving the same routes on
// every mapped domain is what the brief's Part 2.2 asks for, with a
// canonical tag on each page pointing at one host.
const SHARED_LEGAL_PATHS = new Set(["/terms", "/privacy", "/paia"]);

// Crawler files. Next serves these from src/app/robots.ts and sitemap.ts,
// and rewriting them into /bizup meant katisobiz.co.za/robots.txt returned
// a 404 page: a crawler arriving on the new domain could read neither.
// Both files are host-aware, so passing them through gives each domain its
// own rules and its own page list.
const SHARED_CRAWLER_PATHS = new Set(["/robots.txt", "/sitemap.xml"]);

// Growth's own pages, which exist only on the Growth hostname. SiteFooter
// renders on every logged-in KatisoBiz screen and links to all four with
// relative hrefs, so on katisobiz.co.za they were rewritten to
// /bizup/marketplace and friends and returned 404. This is the same bug the
// legal paths above already had, four routes further on.
//
// Sent to Growth rather than served here, unlike the legal pages: these are
// Growth product pages, a KatisoBiz member clicking Marketplace wants
// Growth, and serving them on both hostnames would put the same content on
// two domains with no canonical tag to say which one counts.
// KatisoBiz's own brand domain, and the target every older hostname is
// sent to.
const KATISOBIZ_ORIGIN = "https://katisobiz.co.za";

// The hostnames KatisoBiz used before it had its own domain. Kept working
// so nothing already sent to a customer breaks, but redirected rather than
// served, so there is only ever one live copy of the site.
const LEGACY_HOSTS = new Set(["bizup.digitalflyer.co.za", "katisobiz.digitalflyer.co.za"]);

const GROWTH_ONLY_PATHS = ["/marketplace", "/katisobiz-members", "/shop", "/agents"];
const GROWTH_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? "https://growth.digitalflyersa.co.za";

// Next generates these without a file extension, so they need naming
// explicitly rather than being caught by the dot test below.
const METADATA_IMAGE_SEGMENTS = ["opengraph-image", "twitter-image", "icon", "apple-icon"];

// The Desk. A private single-user tool on its own hostname, with no link to
// it from anywhere and no path from the public site.
//
// Matched on the first label like the KatisoBiz branch below, so it answers
// on desk.katisobiz.co.za without needing to know the rest of the hostname.
// desk. is checked before katisobiz. because a first-label match on "desk"
// would otherwise never be reached.
const DESK_PREFIX = "/desk";

// Set on every Desk response, on both hostnames. A meta tag in the layout
// would cover pages only; the header also covers the export endpoint, and it
// is what a fetch of the URL can be checked against.
const NOINDEX = "noindex, nofollow";

export function proxy(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";

  // KatisoBiz (BizUp/docs/bizup-phase1-spec.md Sec 14.2: same app, shared auth
  // and Supabase/Resend wiring, with katisobiz.co.za mapped as an
  // additional domain in Vercel rather than a separate deployment).
  // Matched on the first label rather than the full hostname, so this
  // answers on katisobiz.co.za, katisobiz.digitalflyer.co.za and the old
  // bizup.digitalflyer.co.za alike. That matters while the new domain's
  // DNS is still being set up: the subdomain works off the existing
  // wildcard and needs no registrar change, and nothing already sent out
  // on the old name breaks. www is the one case the first label cannot
  // express, so it stays explicit. The bizup. branch can be dropped once
  // nothing points at it.
  const host = hostname.split(":")[0].toLowerCase();
  const firstLabel = host.split(".")[0];

  if (firstLabel === "desk") {
    const { pathname } = request.nextUrl;

    // Files with an extension are served as-is, same rule as the KatisoBiz
    // branch: a page route never has a dot in its last segment.
    if (pathname.slice(pathname.lastIndexOf("/")).includes(".")) {
      return NextResponse.next();
    }

    // desk.katisobiz.co.za/       -> /desk
    // desk.katisobiz.co.za/today  -> /desk/today
    //
    // Already-prefixed paths pass through unchanged rather than becoming
    // /desk/desk, so a redirect() inside the app that uses an absolute
    // /desk/... path still lands in the right place on this hostname.
    const url = request.nextUrl.clone();
    if (!(pathname === DESK_PREFIX || pathname.startsWith(`${DESK_PREFIX}/`))) {
      url.pathname = pathname === "/" ? DESK_PREFIX : `${DESK_PREFIX}${pathname}`;
    }

    const response = NextResponse.rewrite(url);
    response.headers.set("X-Robots-Tag", NOINDEX);
    return response;
  }

  // The same pages reached on the Growth hostname. Auth-gated either way,
  // but the header has to be here too or the path is indexable while the
  // subdomain is not.
  if (request.nextUrl.pathname === DESK_PREFIX || request.nextUrl.pathname.startsWith(`${DESK_PREFIX}/`)) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", NOINDEX);
    return response;
  }

  // Moxie Magazine, the third product on this application. moxiemag.co.za is
  // an additional domain on the same Vercel project, rewritten to /moxie the
  // same way katisobiz.co.za is rewritten to /bizup.
  //
  // Unlike The Desk above, this branch sets no X-Robots-Tag. That is the
  // point of it. The WordPress site this replaces is already indexed and
  // ranking, and a noindex header leaking onto this hostname would throw
  // that away silently, with nothing on any screen to show it had happened.
  if (isMoxieHost(host)) {
    const { pathname } = request.nextUrl;

    // API routes are never rewritten under any hostname. The Paystack
    // webhook posts to an absolute /api path and a rewrite here would
    // silently break every subscription payment.
    if (pathname.startsWith("/api/")) return NextResponse.next();

    // Any file with an extension is served as-is from public/. A dot in the
    // last segment is the tell: page routes never have one. Hoisted to the
    // top of the branch for the same reason the KatisoBiz one was, after a
    // moved logo file 404ed during a paid campaign.
    if (pathname.slice(pathname.lastIndexOf("/")).includes(".")) {
      return NextResponse.next();
    }

    // The company-wide legal pages, served as-is here too. One set of
    // documents for the whole business, not one per product: Digital Flyer
    // (Pty) Ltd is the registered POPIA responsible party behind all three,
    // and two privacy policies drift apart within a year.
    if (SHARED_LEGAL_PATHS.has(pathname)) return NextResponse.next();

    // robots.txt and sitemap.xml are host-aware and answer for themselves.
    // Rewriting them into /moxie would 404 both, which is exactly the
    // regression this build exists to avoid.
    if (SHARED_CRAWLER_PATHS.has(pathname)) return NextResponse.next();

    // moxiemag.co.za/          -> /moxie
    // moxiemag.co.za/subscribe -> /moxie/subscribe
    //
    // Already-prefixed paths pass through unchanged rather than becoming
    // /moxie/moxie, so a redirect() inside the app that uses an absolute
    // /moxie/... path still lands in the right place on this hostname.
    const moxieUrl = request.nextUrl.clone();
    if (!(pathname === MOXIE_PREFIX || pathname.startsWith(`${MOXIE_PREFIX}/`))) {
      moxieUrl.pathname = pathname === "/" ? MOXIE_PREFIX : `${MOXIE_PREFIX}${pathname}`;
    }
    return NextResponse.rewrite(moxieUrl);
  }

  // The same Moxie pages reached on any other hostname: the Growth domain
  // while the DNS is still being set up, and every Vercel preview URL.
  //
  // Marked noindex, and this is not a temporary measure waiting for a flag.
  // It is permanently right. A request on moxiemag.co.za returns from the
  // branch above and never reaches this line, so the real site is always
  // indexable; every other hostname is serving a duplicate of it. The old
  // WordPress site is already indexed and ranking, and a second copy of the
  // same content on a second domain splits that with nothing to say which
  // one counts.
  //
  // Blocks crawlers only. People and payments are untouched, so the site can
  // be live and taking memberships on the Growth domain today and simply
  // start being indexed the day the domain moves.
  if (
    request.nextUrl.pathname === MOXIE_PREFIX ||
    request.nextUrl.pathname.startsWith(`${MOXIE_PREFIX}/`)
  ) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", NOINDEX);
    return response;
  }

  if (firstLabel === "katisobiz" || firstLabel === "bizup" || host === "www.katisobiz.co.za") {
    const { pathname } = request.nextUrl;

    // API routes are never rewritten under any hostname. The Paystack,
    // Resend and WhatsApp webhooks all post to absolute /api paths, and a
    // rewrite here would silently break them.
    if (pathname.startsWith("/api/")) return NextResponse.next();

    // Any file with an extension is served as-is, wherever it lives under
    // public/. A dot in the last segment is the tell: page routes never
    // have one.
    //
    // This check used to sit inside the /bizup branch below, which meant it
    // only protected files under public/bizup. Moving the logo to
    // public/katisobiz on 29 July took it outside that branch, so every
    // request for it was rewritten to /bizup/katisobiz/logo.png and 404ed:
    // the header logo vanished from the live landing page during a paid
    // campaign. Hoisted here so it covers the whole public directory and
    // this cannot happen again to the next file that moves.
    if (pathname.slice(pathname.lastIndexOf("/")).includes(".")) {
      return NextResponse.next();
    }

    // The old hostnames send visitors to the brand domain instead of
    // serving a second copy of the site.
    //
    // Site audit, 28 July 2026: both of these answered 200 with the full
    // landing page. Search consolidation was already safe, because every
    // page carries a canonical tag, but three things were not. Every
    // internal link on a duplicate points back at the duplicate, so
    // somebody arriving on an old link signed up on a hostname that is not
    // the one verified with Meta. Pixel and analytics data split across
    // hostnames. And the address bar showed the old product name.
    //
    // Assets are deliberately excluded. Next's image optimizer fetches a
    // source image back through this proxy, and a redirect there makes it
    // return the redirect rather than an optimized image, which is a bug
    // this file has already had once.
    //
    // www.katisobiz.co.za is absent because Vercel's own domain
    // configuration already redirects it, verified against the live site.
    if (LEGACY_HOSTS.has(host)) {
      const lastSegment = pathname.slice(pathname.lastIndexOf("/"));
      const isAsset =
        lastSegment.includes(".") ||
        METADATA_IMAGE_SEGMENTS.some((seg) => pathname.endsWith(`/${seg}`));

      if (!isAsset) {
        // The prefix is stripped here too, so an old /bizup/signup link
        // lands on the canonical /signup in one hop rather than two.
        const target =
          pathname === BIZUP_PREFIX || pathname.startsWith(`${BIZUP_PREFIX}/`)
            ? pathname.slice(BIZUP_PREFIX.length) || "/"
            : pathname;

        // Query string carried across: an ad click arriving on an old
        // hostname must keep its fbclid and UTM parameters, or the signup
        // it produces cannot be attributed to the ad that paid for it.
        return NextResponse.redirect(
          new URL(`${target}${request.nextUrl.search}`, KATISOBIZ_ORIGIN),
          301
        );
      }
    }

    // The shared legal pages, served as-is on this hostname too.
    if (SHARED_LEGAL_PATHS.has(pathname)) return NextResponse.next();
    if (SHARED_CRAWLER_PATHS.has(pathname)) return NextResponse.next();

    // Growth's pages live on Growth's hostname. Prefix matched so a child
    // route such as /agents/apply travels with its parent.
    if (GROWTH_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return NextResponse.redirect(new URL(pathname + request.nextUrl.search, GROWTH_ORIGIN));
    }

    // On KatisoBiz's own hostname the /bizup prefix is redundant, so it is
    // redirected away rather than merely tolerated. Previously both forms
    // worked and the app's own redirect() calls use absolute /bizup/...
    // paths, so members ended up looking at katisobiz.co.za/bizup/login.
    //
    // This cannot loop. The redirect only fires for a URL the browser
    // actually requested with the prefix; the rewrite below is internal and
    // does not re-enter the proxy.
    if (pathname === BIZUP_PREFIX || pathname.startsWith(`${BIZUP_PREFIX}/`)) {
      // Files with an extension are already handled above, for every path
      // rather than just this branch.
      //
      // Next's generated metadata images have no file extension, so the dot
      // test above misses them and they were being redirected. A social
      // preview fetcher does not follow redirects reliably, and the one
      // place that matters is the WhatsApp card for a link a member just
      // shared, so these pass through untouched too.
      if (METADATA_IMAGE_SEGMENTS.some((seg) => pathname.endsWith(`/${seg}`))) {
        return NextResponse.next();
      }

      const stripped = pathname.slice(BIZUP_PREFIX.length) || "/";
      const canonical = request.nextUrl.clone();
      canonical.pathname = stripped;
      return NextResponse.redirect(canonical);
    }

    // katisobiz.co.za/login -> /bizup/login
    // katisobiz.co.za/      -> /bizup
    const bizupUrl = request.nextUrl.clone();
    bizupUrl.pathname = pathname === "/" ? BIZUP_PREFIX : `${BIZUP_PREFIX}${pathname}`;
    return NextResponse.rewrite(bizupUrl);
  }

  if (!hostname.startsWith("agent.")) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // No slug at all (someone visits the bare subdomain), so there is
  // nothing to attribute. Send them straight to the main site, not a 404.
  if (pathname === "/" || pathname === "") {
    return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL));
  }

  const url = request.nextUrl.clone();
  url.pathname = `/agent-link${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Excludes Next.js internals and static assets, because this only ever
  // needs to inspect real page and route requests. The agent subdomain has no
  // static assets of its own to worry about excluding separately.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
