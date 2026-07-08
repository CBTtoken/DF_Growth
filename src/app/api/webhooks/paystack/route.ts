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

  // generateLink creates the auth user but does not send an email itself —
  // for the test/pilot phase we log the action_link so it can be copied
  // manually. Wiring a transactional email send (Resend, per CLAUDE.md
  // Section 4) is required before this goes to real customers.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError) {
    console.error("Failed to generate magic link", linkError);
  } else if (linkData?.user) {
    const { error: memberError } = await admin.from("growth_members").insert({
      user_id: linkData.user.id,
      growth_client_id: inserted.id,
      role: "growth_owner",
    });
    if (memberError) {
      console.error("Failed to create growth_member", memberError);
    } else {
      console.log(`Magic link for ${email}: ${linkData.properties?.action_link}`);
    }
  }

  return NextResponse.json({ received: true });
}
