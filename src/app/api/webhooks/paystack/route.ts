import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
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

  const { customer, metadata, reference } = event.data;
  const email: string | undefined = customer?.email;
  const businessName: string | undefined = metadata?.business_name;
  const tier: string | undefined = metadata?.tier;

  if (!email || !businessName || !tier || !reference) {
    console.error("charge.success missing expected metadata", { email, businessName, tier, reference });
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();

  // Found via a real stress test: the old idempotency check was keyed on
  // slug (derived from business_name), which meant any two businesses that
  // ever picked the same name — not just concurrent signups, any two, ever
  // — would collide. The second one would already have been charged by
  // Paystack, then silently fail to get a growth_clients row at all: no
  // account, no email, no admin visibility, nothing. Idempotency now keys on
  // Paystack's own transaction reference, which is the actually-correct
  // signal for "have I already processed this specific charge" (Paystack
  // redelivers webhook events; this is the case that check is really for).
  // Slug collisions are a separate, expected case — handled below by
  // disambiguating the slug, not rejecting the signup.
  const { data: existing } = await admin
    .from("growth_clients")
    .select("id")
    .eq("paystack_reference", reference)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ received: true });
  }

  const baseSlug = slugify(businessName);
  let inserted: { id: string } | null = null;
  let insertError: { message: string; code?: string } | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidateSlug = attempt === 0 ? baseSlug : `${baseSlug}-${crypto.randomBytes(2).toString("hex")}`;
    const { data, error } = await admin
      .from("growth_clients")
      .insert({
        business_name: businessName,
        slug: candidateSlug,
        plan: tier,
        status: "pending_intake",
        paystack_reference: reference,
      })
      .select("id")
      .single();

    if (!error) {
      inserted = data;
      insertError = null;
      break;
    }

    insertError = error;
    // 23505 = unique_violation. If it's the reference that collided, a
    // concurrent request for this exact same event just won — safe to stop
    // and treat as already handled. If it's the slug, retry with a
    // disambiguated one; any other error, stop and log it below.
    if (error.code !== "23505") break;
    if (error.message.includes("paystack_reference")) {
      return NextResponse.json({ received: true });
    }
  }

  if (!inserted || insertError) {
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

  let ownerUserId: string | null = null;

  if (inviteError) {
    if (inviteError.code === "email_exists") {
      // Found via a real second signup on an email that already had an
      // account (same person buying a second tier, or a repeat test):
      // inviteUserByEmail only works for brand-new emails and fails with
      // this exact code otherwise, and the previous code just logged that
      // error and stopped — leaving a real, paid growth_clients row with no
      // linked user and no email ever sent, silently stranding the
      // customer. A user can legitimately belong to more than one
      // growth_client (see the comment in onboard/page.tsx), so the correct
      // behavior is to link their existing account to this new client, not
      // reject the signup. inviteUserByEmail can't message an existing
      // user, but signInWithOtp can — it emails a real working sign-in link
      // through the same Supabase mailer, whether the account is new or not.
      // admin.listUsers() has no email filter in this SDK version, so hit
      // the REST endpoint directly (it does support ?email=).
      const lookupRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
        {
          headers: {
            apikey: process.env.SUPABASE_SECRET_KEY!,
            Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
          },
        }
      );
      const lookupData = await lookupRes.json();
      ownerUserId = lookupData?.users?.[0]?.id ?? null;

      if (ownerUserId) {
        const anon = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
        );
        const { error: otpError } = await anon.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/onboard` },
        });
        if (otpError) {
          console.error("Failed to send sign-in link to existing user", otpError);
        }
      }
    } else {
      console.error("Failed to invite user by email", inviteError);
    }
  } else if (inviteData?.user) {
    ownerUserId = inviteData.user.id;
  }

  if (ownerUserId) {
    const { error: memberError } = await admin.from("growth_members").insert({
      user_id: ownerUserId,
      growth_client_id: inserted.id,
      role: "growth_owner",
    });
    if (memberError) {
      console.error("Failed to create growth_member", memberError);
    }
  }

  return NextResponse.json({ received: true });
}
