import { NextResponse, type NextRequest } from "next/server";

// Agent Referral Programme, real agent feedback follow-up: personalized
// referral links live on their own subdomain (agent.digitalflyersa.co.za/
// losaan) rather than a path on the main site, so the link itself reads as
// dedicated to the agent, not another page of growth.digitalflyersa.co.za.
// This is the one place in the app that needs a proxy (Next.js 16's rename
// of middleware) at all — every other route is served from the main
// domain the normal way. A request
// arriving on the agent subdomain is rewritten internally to the actual
// route handler (src/app/agent-link/[slug]/route.ts); the browser's
// address bar keeps showing the personalized URL throughout.
export function proxy(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";

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
