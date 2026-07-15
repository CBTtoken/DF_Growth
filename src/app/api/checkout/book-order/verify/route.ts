import { NextResponse } from "next/server";

// STANDING365_LANDING_BUILD_SPEC_CLAUDE.md Sec 10: the public page route
// this returns to ([clientSlug]/page.tsx) is force-static (Task #12's LCP
// fix), which means a server component there can't read a real per-request
// searchParams — it's always {} on a statically-served page. So the
// success/failure check happens client-side instead (OrderReturnBanner
// reads window.location.search after the static HTML has already loaded),
// calling this route to do the actual Paystack verification server-side,
// where the secret key belongs. Read-only — book_orders itself is still
// only ever written by the webhook (the reliable, guaranteed-delivery
// source of truth), this route exists purely to tell the UI what to show.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("reference");

  if (!reference) {
    return NextResponse.json({ status: "failed" }, { status: 400 });
  }

  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  const data = await res.json();

  const status = data?.data?.status === "success" ? "success" : "failed";
  return NextResponse.json({ status });
}
