import { NextResponse, type NextRequest } from "next/server";

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

// Next generates these without a file extension, so they need naming
// explicitly rather than being caught by the dot test below.
const METADATA_IMAGE_SEGMENTS = ["opengraph-image", "twitter-image", "icon", "apple-icon"];

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
  if (firstLabel === "katisobiz" || firstLabel === "bizup" || host === "www.katisobiz.co.za") {
    const { pathname } = request.nextUrl;

    // API routes are never rewritten under any hostname. The Paystack,
    // Resend and WhatsApp webhooks all post to absolute /api paths, and a
    // rewrite here would silently break them.
    if (pathname.startsWith("/api/")) return NextResponse.next();

    // The shared legal pages, served as-is on this hostname too.
    if (SHARED_LEGAL_PATHS.has(pathname)) return NextResponse.next();
    if (SHARED_CRAWLER_PATHS.has(pathname)) return NextResponse.next();

    // On KatisoBiz's own hostname the /bizup prefix is redundant, so it is
    // redirected away rather than merely tolerated. Previously both forms
    // worked and the app's own redirect() calls use absolute /bizup/...
    // paths, so members ended up looking at katisobiz.co.za/bizup/login.
    //
    // This cannot loop. The redirect only fires for a URL the browser
    // actually requested with the prefix; the rewrite below is internal and
    // does not re-enter the proxy.
    if (pathname === BIZUP_PREFIX || pathname.startsWith(`${BIZUP_PREFIX}/`)) {
      // Static files under public/bizup are the exception: they are served
      // as-is, neither redirected nor rewritten. Next's image optimizer
      // fetches the source image back through this proxy, so redirecting
      // /bizup/logo.png made the optimizer return its 307 instead of an
      // optimized image, costing the header logo an extra round trip and
      // the WebP conversion. A dot in the last segment is the tell: page
      // routes never have one.
      if (pathname.slice(pathname.lastIndexOf("/")).includes(".")) {
        return NextResponse.next();
      }

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

  // No slug at all (someone visits the bare subdomain) — nothing to
  // attribute, send them straight to the main site rather than a 404.
  if (pathname === "/" || pathname === "") {
    return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL));
  }

  const url = request.nextUrl.clone();
  url.pathname = `/agent-link${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Excludes Next.js internals and static assets — this only ever needs to
  // inspect real page/route requests, and the agent subdomain has no
  // static assets of its own to worry about excluding separately.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
