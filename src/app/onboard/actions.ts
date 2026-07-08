"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/onboard/require-growth-client";
import { step1Schema, step2Schema, step3Schema, step4Schema } from "@/lib/schemas/intake";

type FieldErrors = Record<string, string[]> & { _form?: string[] };
export type OnboardState = { error?: FieldErrors; success?: boolean } | null;

// CLAUDE.md Section 6: every step is its own Server Action, auto-saving on
// submit rather than waiting for a final "finish" click, so a client can
// close the tab and resume later just by logging back in.

export async function saveStep1(_prevState: OnboardState, formData: FormData): Promise<OnboardState> {
  const parsed = step1Schema.safeParse({
    businessName: formData.get("businessName"),
    contactEmail: formData.get("contactEmail"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const client = await requireGrowthClientId();
  if (client.error) return { error: { _form: [client.error] } };

  const admin = createAdminClient();
  const { error } = await admin
    .from("growth_clients")
    .update({
      business_name: parsed.data.businessName,
      contact_email: parsed.data.contactEmail,
    })
    .eq("id", client.id);

  if (error) return { error: { _form: ["Could not save, please try again."] } };

  revalidatePath("/onboard");
  return { success: true };
}

export async function saveStep2(_prevState: OnboardState, formData: FormData): Promise<OnboardState> {
  const parsed = step2Schema.safeParse({
    brandPrimaryColor: formData.get("brandPrimaryColor"),
    brandSecondaryColor: formData.get("brandSecondaryColor"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const client = await requireGrowthClientId();
  if (client.error) return { error: { _form: [client.error] } };

  const admin = createAdminClient();
  const { error } = await admin
    .from("growth_clients")
    .update({
      brand_primary_color: parsed.data.brandPrimaryColor,
      brand_secondary_color: parsed.data.brandSecondaryColor,
    })
    .eq("id", client.id);

  if (error) return { error: { _form: ["Could not save, please try again."] } };

  revalidatePath("/onboard");
  return { success: true };
}

export async function saveStep3(_prevState: OnboardState, formData: FormData): Promise<OnboardState> {
  const parsed = step3Schema.safeParse({
    headline: formData.get("headline"),
    subheadline: formData.get("subheadline"),
    ctaLabel: formData.get("ctaLabel"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const client = await requireGrowthClientId();
  if (client.error) return { error: { _form: [client.error] } };

  const admin = createAdminClient();
  const { data: growthClient } = await admin
    .from("growth_clients")
    .select("slug, plan")
    .eq("id", client.id)
    .single();

  if (!growthClient) return { error: { _form: ["Could not find your account, please try again."] } };

  const { error: landingPageError } = await admin.from("landing_pages").upsert(
    {
      growth_client_id: client.id,
      slug: growthClient.slug,
      headline: parsed.data.headline,
      subheadline: parsed.data.subheadline,
      cta_label: parsed.data.ctaLabel,
      // The rendered landing page (Section 7.1) treats the CTA as the lead
      // form trigger, not a real navigation target — this anchor just
      // satisfies the NOT NULL constraint, it's not shown to visitors.
      cta_href: "#lead-form",
      // No separate "publish" UI exists yet, so the page goes live the
      // moment the client's account does. Foundation finishes right here;
      // growth_engine/enterprise still have step 4, so their page publishes
      // there instead, in step with their status flipping to active too.
      published: growthClient.plan === "foundation",
    },
    { onConflict: "growth_client_id,slug" }
  );

  if (landingPageError) return { error: { _form: ["Could not save, please try again."] } };

  // Foundation tier has no step 4 (no Meta connection to make), so the
  // wizard ends here for them.
  if (growthClient.plan === "foundation") {
    await admin.from("growth_clients").update({ status: "active" }).eq("id", client.id);
  }

  revalidatePath("/onboard");
  return { success: true };
}

export async function saveStep4(_prevState: OnboardState, formData: FormData): Promise<OnboardState> {
  const parsed = step4Schema.safeParse({
    hasMetaSetup: formData.get("hasMetaSetup"),
    metaPixelId: formData.get("metaPixelId") || undefined,
    metaAdAccountId: formData.get("metaAdAccountId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors as FieldErrors };
  }

  const client = await requireGrowthClientId();
  if (client.error) return { error: { _form: [client.error] } };

  const admin = createAdminClient();
  const { error } =
    parsed.data.hasMetaSetup === "yes"
      ? await admin
          .from("growth_clients")
          .update({
            meta_pixel_id: parsed.data.metaPixelId,
            meta_ad_account_id: parsed.data.metaAdAccountId,
            meta_setup_requested_help: false,
            status: "active",
          })
          .eq("id", client.id)
      : await admin
          .from("growth_clients")
          .update({
            meta_pixel_id: null,
            meta_ad_account_id: null,
            meta_setup_requested_help: true,
            status: "active",
          })
          .eq("id", client.id);

  if (error) return { error: { _form: ["Could not save, please try again."] } };

  // Step 4 is the finish line for growth_engine/enterprise, so this is
  // where their page goes live (foundation publishes back in step 3).
  await admin.from("landing_pages").update({ published: true }).eq("growth_client_id", client.id);

  revalidatePath("/onboard");
  return { success: true };
}
