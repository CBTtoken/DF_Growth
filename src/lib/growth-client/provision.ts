import crypto from "crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slugify";
import type { Tier } from "@/lib/paystack/plans";

type ProvisionResult = { id: string; slug: string } | { error: string };

// Shared by both ways a growth_clients row gets created: the Paystack
// webhook (growth_engine/enterprise, after payment succeeds) and the
// no-payment Foundation trial signup (src/app/pricing/actions.ts). Started
// as webhook-only logic; factored out once the trial flow needed the exact
// same slug-disambiguation + account-linking behavior rather than a second,
// easy-to-drift copy of it.
export async function provisionGrowthClient({
  businessName,
  email,
  plan,
  status,
  paystackReference,
}: {
  businessName: string;
  email: string;
  plan: Tier;
  status: "pending_intake" | "active";
  paystackReference: string | null;
}): Promise<ProvisionResult> {
  const admin = createAdminClient();
  const baseSlug = slugify(businessName);
  let inserted: { id: string; slug: string } | null = null;
  let insertError: { message: string; code?: string } | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidateSlug = attempt === 0 ? baseSlug : `${baseSlug}-${crypto.randomBytes(2).toString("hex")}`;
    const { data, error } = await admin
      .from("growth_clients")
      .insert({
        business_name: businessName,
        slug: candidateSlug,
        plan,
        status,
        paystack_reference: paystackReference,
        contact_email: email,
      })
      .select("id, slug")
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
    if (paystackReference && error.message.includes("paystack_reference")) {
      return { error: "duplicate_reference" };
    }
  }

  if (!inserted || insertError) {
    console.error("Failed to create growth_client", insertError);
    return { error: "insert_failed" };
  }

  // Found via a real customer signup never receiving an email: generateLink
  // only ever *generates* a link, it never dispatches mail — inviteUserByEmail
  // creates the auth user the same way but also sends it through Supabase's
  // built-in mailer (confirmed live: confirmation_sent_at comes back
  // populated). The email itself is generic/unbranded since custom SMTP
  // isn't configured — acceptable for the pilot phase.
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/onboard`,
  });

  let ownerUserId: string | null = null;

  if (inviteError) {
    if (inviteError.code === "email_exists") {
      // A user can legitimately belong to more than one growth_client (see
      // the comment in onboard/page.tsx) — link their existing account to
      // this new client rather than reject the signup. inviteUserByEmail
      // can't message an existing user, but signInWithOtp can.
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

  return { id: inserted.id, slug: inserted.slug };
}
