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
  consentedAt,
  marketingConsent,
  billingCycle,
  foundingSignupNumber,
}: {
  businessName: string;
  email: string;
  plan: Tier;
  status: "pending_intake" | "active";
  paystackReference: string | null;
  // Sprint 1, Build Item 9: captured at the point of registration (the
  // pricing-page form, before payment or trial activation), threaded
  // through here so it lands on the row the moment it's created rather
  // than needing a separate update after the fact.
  consentedAt: string | null;
  // Combined spec Sec 17: the separate, optional "send me updates"
  // checkbox — distinct from consentedAt, which only ever covers the
  // required legal agreement.
  marketingConsent: boolean;
  // Sprint 1, Build Item 1: captured for every plan (useful regardless of
  // founding eligibility) — Foundation is always "monthly", it has no
  // annual option today.
  billingCycle: "monthly" | "annual";
  // Non-null only for the specific case that actually qualifies for
  // founding status (Growth annual, under the cap) — the caller (the
  // webhook) decides eligibility and the candidate number; this function
  // only needs to know whether to write it and detect a real collision.
  foundingSignupNumber: number | null;
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
        consented_at: consentedAt,
        marketing_consent: marketingConsent,
        billing_cycle: billingCycle,
        is_founding_member: foundingSignupNumber !== null,
        founding_signup_number: foundingSignupNumber,
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
    // and treat as already handled. If it's the founding slot number, a
    // genuinely different concurrent Growth-annual signup won the same
    // slot first — the caller (the webhook) re-counts and retries the
    // whole thing with a fresh candidate number, this function itself
    // doesn't retry that case since it doesn't own the counting logic. If
    // it's the slug, retry with a disambiguated one here; any other error,
    // stop and log it below.
    if (error.code !== "23505") break;
    if (paystackReference && error.message.includes("paystack_reference")) {
      return { error: "duplicate_reference" };
    }
    if (foundingSignupNumber !== null && error.message.includes("founding_signup_number")) {
      return { error: "duplicate_founding_number" };
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
    // Sprint 1 fix, Section 1 — see src/app/auth/callback/page.tsx's own
    // comment for why this can no longer point straight at /onboard.
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
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
          // Sprint 1 fix, Section 1 — this is the exact code path most
          // likely to have caused the reported bug: an email that already
          // has an account (and quite possibly an active browser session)
          // being linked to a brand-new growth_client and re-invited.
          options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
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
