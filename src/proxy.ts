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
// It now also carries BizUp's host routing, see below. Both branches are
// host-gated and every other hostname returns untouched, so the live
// Growth site is unaffected by construction rather than by the rewrite
// rules happening to be correct.
const BIZUP_PREFIX = "/bizup";

export function proxy(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";

  // BizUp (BizUp/docs/bizup-phase1-spec.md Sec 14.2: same app, shared auth
  // and Supabase/Resend wiring, with bizup.digitalflyer.co.za mapped as an
  // additional domain in Vercel rather than a separate deployment).
  if (hostname.split(":")[0].toLowerCase().startsWith("bizup.")) {
    const { pathname } = request.nextUrl;

    // API routes are never rewritten under any hostname. The Paystack,
    // Resend and WhatsApp webhooks all post to absolute /api paths, and a
    // rewrite here would silently break them.
    if (pathname.startsWith("/api/")) return NextResponse.next();

    // Already an explicit /bizup/... path. Left alone rather than
    // rewritten, which is what stops /bizup/login becoming
    // /bizup/bizup/login. Both URL forms therefore work on this hostname,
    // so every existing Link in the app (all of which use the /bizup/...
    // form) keeps working without a host-aware URL helper.
    if (pathname === BIZUP_PREFIX || pathname.startsWith(`${BIZUP_PREFIX}/`)) {
      return NextResponse.next();
    }

    // bizup.digitalflyer.co.za/login -> /bizup/login
    // bizup.digitalflyer.co.za/      -> /bizup
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
