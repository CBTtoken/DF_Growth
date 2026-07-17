import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify, RESERVED_SLUGS } from "@/lib/slugify";
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
  referredByAgentId,
  isAgentComped,
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
  // Agent Referral Programme Sec 5: resolved server-side by the caller
  // (pricing/actions.ts, the only call site with request/cookie context —
  // the webhook's own call for enterprise's upfront-pay path has none)
  // before this insert, not looked up in here.
  referredByAgentId?: string | null;
  // Agent Referral Programme Sec 4: a comped account is otherwise a normal
  // Foundation signup — same wizard, same lack of a payment step — the
  // only special handling is onboard/actions.ts leaving trial_ends_at
  // null for one of these, so the 7-day trial clock never starts.
  isAgentComped?: boolean;
}): Promise<ProvisionResult> {
  const admin = createAdminClient();
  const baseSlug = slugify(businessName);
  // Public Beta Polish Sprint Sec 13.2: a business genuinely named
  // "Growth" or "Admin" isn't refused a page outright — this just forces
  // the same random-suffix disambiguation every subsequent-attempt slug
  // already gets, so the reserved word can never itself become a live,
  // unsuffixed slug at /[slug].
  const baseSlugReserved = RESERVED_SLUGS.has(baseSlug);
  let inserted: { id: string; slug: string } | null = null;
  let insertError: { message: string; code?: string } | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidateSlug =
      attempt === 0 && !baseSlugReserved ? baseSlug : `${baseSlug}-${crypto.randomBytes(2).toString("hex")}`;
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
        referred_by_agent_id: referredByAgentId ?? null,
        is_agent_comped: isAgentComped ?? false,
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
      // can't message an existing user. admin.listUsers() has no email
      // filter in this SDK version, so hit the REST endpoint directly (it
      // does support ?email=).
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
      const existingUser = lookupData?.users?.[0] as
        | { id: string; app_metadata?: { has_password?: boolean } }
        | undefined;
      ownerUserId = existingUser?.id ?? null;

      // Public Beta Polish Sprint Sec 1: retires the signInWithOtp magic
      // link this used to send here — the exact code path most likely to
      // have caused a real, previously-reported account cross-contamination
      // bug (see auth/callback/page.tsx's own comment). An account that's
      // already set a password doesn't need any email at all: the new
      // growth_member link below is enough, they'll see this business next
      // time they log in normally. Only a still-unmigrated account (never
      // set a password) gets a fresh set-password email — the same
      // resetPasswordForEmail flow /forgot-password uses, landing on
      // /set-password via auth/callback's has_password check rather than
      // straight into a dashboard.
      if (ownerUserId && existingUser?.app_metadata?.has_password !== true) {
        const { error: resetError } = await admin.auth.resetPasswordForEmail(email, {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        });
        if (resetError) {
          console.error("Failed to send set-password email to existing user", resetError);
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
