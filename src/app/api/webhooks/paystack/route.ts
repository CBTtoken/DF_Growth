import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slugify";

// CLAUDE.md Section 2.1. Only charge.success is handled: Paystack also fires
// subscription.create for the same payment when a plan is attached to
// transaction/initialize, but that event's data.metadata is not populated
// with the custom metadata set at transaction/initialize time (confirmed by
// testing — it came back empty), so acting on it produced a second, wrong
// growth_clients row with the business name falling back to the email and
// the tier falling back to "foundation". charge.success reliably carries the
// metadata, so it's the only trigger. This means paystack_subscription_code
// stays null for now; backfilling it needs a separate reconciliation once
// something actually reads that column.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  const expected = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(rawBody)
    .digest("hex");

  if (signature !== expected) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true });
  }

  const { customer, metadata } = event.data;
  const email: string | undefined = customer?.email;
  const businessName: string | undefined = metadata?.business_name;
  const tier: string | undefined = metadata?.tier;

  if (!email || !businessName || !tier) {
    console.error("charge.success missing expected metadata", { email, businessName, tier });
    return NextResponse.json({ received: true });
  }

  const slug = slugify(businessName);
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("growth_clients")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ received: true });
  }

  const { data: inserted, error: insertError } = await admin
    .from("growth_clients")
    .insert({
      business_name: businessName,
      slug,
      plan: tier,
      status: "pending_intake",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("Failed to create growth_client", insertError);
    return NextResponse.json({ received: true });
  }

  // Found via a real customer signup never receiving an email: generateLink
  // only ever *generates* a link, it never dispatches mail — the previous
  // version of this code just logged the link to Vercel's server logs,
  // invisible to the actual customer. inviteUserByEmail creates the auth
  // user the same way but also sends it through Supabase's built-in mailer
  // (confirmed live: `confirmation_sent_at` comes back populated). The
  // email itself is generic/unbranded since custom SMTP isn't configured —
  // acceptable for the pilot phase, a Resend-based branded email is still
  // the real long-term fix (CLAUDE.md Section 4) but this unblocks every
  // real signup in the meantime with a one-method change.
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/onboard`,
  });

  if (inviteError) {
    console.error("Failed to invite user by email", inviteError);
  } else if (inviteData?.user) {
    const { error: memberError } = await admin.from("growth_members").insert({
      user_id: inviteData.user.id,
      growth_client_id: inserted.id,
      role: "growth_owner",
    });
    if (memberError) {
      console.error("Failed to create growth_member", memberError);
    }
  }

  return NextResponse.json({ received: true });
}
