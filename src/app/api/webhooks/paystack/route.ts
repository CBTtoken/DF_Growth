import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slugify";

// CLAUDE.md Section 2.1. Paystack can send both charge.success and
// subscription.create for the same payment when a plan is attached to
// transaction/initialize — this handler is idempotent on growth_clients.slug
// so processing either (or both, or a redelivery) doesn't create duplicates.
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

  if (event.event !== "charge.success" && event.event !== "subscription.create") {
    return NextResponse.json({ received: true });
  }

  const { customer, subscription_code, metadata } = event.data;
  const email: string | undefined = customer?.email;
  const businessName: string = metadata?.business_name ?? email ?? "Unknown business";
  const tier: string = metadata?.tier ?? "foundation";

  if (!email) {
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
    if (subscription_code) {
      await admin
        .from("growth_clients")
        .update({ paystack_subscription_code: subscription_code })
        .eq("id", existing.id);
    }
    return NextResponse.json({ received: true });
  }

  const { data: inserted, error: insertError } = await admin
    .from("growth_clients")
    .insert({
      business_name: businessName,
      slug,
      plan: tier,
      paystack_subscription_code: subscription_code ?? null,
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
    await admin.from("growth_members").insert({
      user_id: linkData.user.id,
      growth_client_id: inserted.id,
      role: "growth_owner",
    });
    console.log(`Magic link for ${email}: ${linkData.properties?.action_link}`);
  }

  return NextResponse.json({ received: true });
}
