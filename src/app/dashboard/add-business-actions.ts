"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyPartnerId, ACTIVE_ACCOUNT_COOKIE } from "@/lib/auth/require-growth-client";
import { slugify, RESERVED_SLUGS } from "@/lib/slugify";
import { agentPageSlugExists } from "@/lib/slug-namespace";

export type AddBusinessState = { error?: string } | undefined;

// Lets an existing partner user (BidWeb's Samantha, for example) add another
// of their referred businesses without going through DigitalFlyer or the
// public signup/Paystack flow at all. Mirrors provisionGrowthClient's own
// bare insert shape (business_name, slug, plan, status, contact_email) —
// deliberately the same "freshly provisioned, empty" state a real Foundation
// signup produces, so the existing onboarding wizard this redirects into
// needs no changes to handle it. Comped via partner_id/is_partner_comped
// rather than a trial: BidWeb pays DigitalFlyer directly, this business
// never will.
export async function createPartnerBusiness(_prevState: AddBusinessState, formData: FormData): Promise<AddBusinessState> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Never trust the client on which partner this is — derive it fresh from
  // this login's own existing memberships, same as switchAccount does for
  // account ids.
  const partnerId = await getMyPartnerId();
  if (!partnerId) {
    return { error: "Your login isn't linked to a partner account, so this isn't available." };
  }

  const businessName = String(formData.get("businessName") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim();
  if (businessName.length < 2) {
    return { error: "Enter the business name." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return { error: "Enter a valid contact email." };
  }

  const admin = createAdminClient();
  const baseSlug = slugify(businessName);
  let inserted: { id: string; slug: string } | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const baseSlugReserved = attempt === 0 && (RESERVED_SLUGS.has(baseSlug) || (await agentPageSlugExists(baseSlug)));
    const candidateSlug = attempt === 0 && !baseSlugReserved ? baseSlug : `${baseSlug}-${crypto.randomBytes(2).toString("hex")}`;
    const { data, error } = await admin
      .from("growth_clients")
      .insert({
        business_name: businessName,
        slug: candidateSlug,
        plan: "foundation",
        status: "active",
        contact_email: contactEmail,
        partner_id: partnerId,
        is_partner_comped: true,
        trial_ends_at: null,
        consented_at: null,
        marketing_consent: false,
      })
      .select("id, slug")
      .single();

    if (!error) {
      inserted = data;
      break;
    }
    if (error.code !== "23505") {
      return { error: "Could not create the business, please try again." };
    }
    // Slug collision — retry with a suffixed candidate.
  }

  if (!inserted) {
    return { error: "Could not find a free address for this business, please try again." };
  }

  const { error: memberError } = await admin
    .from("growth_members")
    .insert({ user_id: user.id, growth_client_id: inserted.id, role: "growth_owner" });
  if (memberError) {
    return { error: "Business created, but couldn't link it to your login. Contact DigitalFlyer." };
  }

  // Same pattern as switchAccount: point this login's active-account cookie
  // at the new business before handing off to the wizard, so requireGrowthClientId()
  // resolves it immediately rather than relying on "most recent membership".
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ACCOUNT_COOKIE, inserted.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/onboard");
}
