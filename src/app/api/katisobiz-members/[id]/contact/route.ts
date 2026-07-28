import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Counts a tap on a listing's WhatsApp button, then sends the visitor on.
//
// The count is the whole point. A member getting calls from a free listing
// is the easiest possible conversation about a paid Growth page, and
// without counting them that conversation is guesswork.
//
// Deliberately a redirect rather than a link with a tracking script: it
// works with no JavaScript, it cannot be blocked by an ad blocker, and the
// member's number never appears in the page source, so the listing cannot
// be scraped for phone numbers by anything that does not also announce
// itself by hitting this endpoint.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("bizup_accounts")
    .select("id, whatsapp, phone, listed_publicly, business_name, trading_name")
    .eq("id", id)
    // Re-checked here, not just on the page. A member who opts out must
    // stop being contactable through a link somebody already has.
    .eq("listed_publicly", true)
    .maybeSingle();

  if (!account) {
    return NextResponse.redirect(new URL("/katisobiz-members", process.env.NEXT_PUBLIC_SITE_URL));
  }

  const digits = (account.whatsapp ?? account.phone ?? "").replace(/[^0-9]/g, "");
  const international = digits.startsWith("0027")
    ? digits.slice(2)
    : digits.startsWith("0")
      ? `27${digits.slice(1)}`
      : digits;

  if (international.length < 9) {
    return NextResponse.redirect(new URL("/katisobiz-members", process.env.NEXT_PUBLIC_SITE_URL));
  }

  // Recorded before the redirect but not awaited in a way that could delay
  // it noticeably. A failed insert must never stop the visitor reaching
  // the business: the member losing a customer is far worse than us losing
  // one data point.
  try {
    await admin.from("bizup_listing_clicks").insert({ account_id: account.id, kind: "whatsapp" });
  } catch (err) {
    console.error("Failed to record KatisoBiz listing click", err);
  }

  const name = account.trading_name?.trim() || account.business_name;
  const message = `Good day ${name}, I found you on the KatisoBiz Members List and would like a quote.`;

  return NextResponse.redirect(`https://wa.me/${international}?text=${encodeURIComponent(message)}`);
}
