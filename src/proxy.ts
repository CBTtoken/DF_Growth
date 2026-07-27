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

export function proxy(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";

  // KatisoBiz (BizUp/docs/bizup-phase1-spec.md Sec 14.2: same app, shared auth
  // and Supabase/Resend wiring, with katisobiz.co.za mapped as an
  // additional domain in Vercel rather than a separate deployment).
  // Matches the new katisobiz.co.za and the old bizup.digitalflyer.co.za,
  // so the rename does not break anything already sent out while DNS for
  // the new domain is still being set up. The old one can be dropped once
  // nothing points at it.
  const host = hostname.split(":")[0].toLowerCase();
  if (host === "katisobiz.co.za" || host === "www.katisobiz.co.za" || host.startsWith("bizup.")) {
    const { pathname } = request.nextUrl;

    // API routes are never rewritten under any hostname. The Paystack,
    // Resend and WhatsApp webhooks all post to absolute /api paths, and a
    // rewrite here would silently break them.
    if (pathname.startsWith("/api/")) return NextResponse.next();

    // On KatisoBiz's own hostname the /bizup prefix is redundant, so it is
    // redirected away rather than merely tolerated. Previously both forms
    // worked and the app's own redirect() calls use absolute /bizup/...
    // paths, so members ended up looking at katisobiz.co.za/bizup/login.
    //
    // This cannot loop. The redirect only fires for a URL the browser
    // actually requested with the prefix; the rewrite below is internal and
    // does not re-enter the proxy.
    if (pathname === BIZUP_PREFIX || pathname.startsWith(`${BIZUP_PREFIX}/`)) {
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
