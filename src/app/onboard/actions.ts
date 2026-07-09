"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { step1Schema, step2Schema, step3Schema, step4Schema, step5Schema, step6Schema } from "@/lib/schemas/intake";
import { generateLandingCopy } from "@/lib/ai/draft-copy";

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

// Mirrors the WhatsApp onboarding flow's business-profile fields. Best-effort
// AI drafting happens here too: once we have real facts about the business,
// we hand them to Claude and, if it succeeds, pre-fill the Landing Copy step
// (step 4) with a draft the client reviews and edits — nothing here ever
// publishes on its own (landing_pages.published stays false until step 4/5).
// If the AI call fails for any reason, we simply skip the upsert; the client
// sees a blank Landing Copy step and writes their own, exactly like before
// this feature existed.
export async function saveStep2(_prevState: OnboardState, formData: FormData): Promise<OnboardState> {
  const parsed = step2Schema.safeParse({
    province: formData.get("province"),
    industry: formData.get("industry"),
    businessAddress: formData.get("businessAddress"),
    businessDescription: formData.get("businessDescription"),
    tagline: formData.get("tagline") || "",
    productsServices: formData.get("productsServices"),
    additionalNotes: formData.get("additionalNotes") || "",
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const client = await requireGrowthClientId();
  if (client.error) return { error: { _form: [client.error] } };

  const admin = createAdminClient();
  const { data: growthClient, error } = await admin
    .from("growth_clients")
    .update({
      province: parsed.data.province,
      industry: parsed.data.industry,
      business_address: parsed.data.businessAddress,
      business_description: parsed.data.businessDescription,
      tagline: parsed.data.tagline || null,
      products_services: parsed.data.productsServices,
      additional_notes: parsed.data.additionalNotes || null,
    })
    .eq("id", client.id)
    .select("business_name")
    .single();

  if (error || !growthClient) return { error: { _form: ["Could not save, please try again."] } };

  const draft = await generateLandingCopy({
    businessName: growthClient.business_name,
    industry: parsed.data.industry,
    province: parsed.data.province,
    businessDescription: parsed.data.businessDescription,
    tagline: parsed.data.tagline ?? "",
    productsServices: parsed.data.productsServices,
    additionalNotes: parsed.data.additionalNotes ?? "",
  });

  if (draft) {
    await admin.from("growth_clients").update({ ai_landing_draft: draft }).eq("id", client.id);
  }

  revalidatePath("/onboard");
  return { success: true };
}

export async function saveStep3(_prevState: OnboardState, formData: FormData): Promise<OnboardState> {
  const parsed = step3Schema.safeParse({
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

export async function saveStep4(_prevState: OnboardState, formData: FormData): Promise<OnboardState> {
  const parsed = step4Schema.safeParse({
    headline: formData.get("headline"),
    subheadline: formData.get("subheadline"),
    aboutText: formData.get("aboutText"),
    servicesText: formData.get("servicesText"),
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
      about_text: parsed.data.aboutText,
      services_text: parsed.data.servicesText,
      cta_label: parsed.data.ctaLabel,
      // The rendered landing page (Section 7.1) treats the CTA as the lead
      // form trigger, not a real navigation target — this anchor just
      // satisfies the NOT NULL constraint, it's not shown to visitors.
      cta_href: "#lead-form",
      // Never published here anymore — step 5 (packages) is now the finish
      // line for Foundation, step 6 (Meta) for growth_engine/enterprise.
      published: false,
    },
    { onConflict: "growth_client_id,slug" }
  );

  if (landingPageError) return { error: { _form: ["Could not save, please try again."] } };

  revalidatePath("/onboard");
  return { success: true };
}

// Applies to every tier, unlike the Meta step — most small businesses have
// some kind of pricing structure even if they don't run ads. Entirely
// optional: an all-blank submit is valid, just stores an empty array.
export async function saveStep5(_prevState: OnboardState, formData: FormData): Promise<OnboardState> {
  const parsed = step5Schema.safeParse({
    package1Name: formData.get("package1Name") || "",
    package1Price: formData.get("package1Price") || "",
    package1Description: formData.get("package1Description") || "",
    package2Name: formData.get("package2Name") || "",
    package2Price: formData.get("package2Price") || "",
    package2Description: formData.get("package2Description") || "",
    package3Name: formData.get("package3Name") || "",
    package3Price: formData.get("package3Price") || "",
    package3Description: formData.get("package3Description") || "",
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const client = await requireGrowthClientId();
  if (client.error) return { error: { _form: [client.error] } };

  // A slot only counts as a real package if it has a name — a price or
  // description typed into an otherwise-blank slot without a name isn't
  // something we can render sensibly.
  const packages = [
    { name: parsed.data.package1Name, price: parsed.data.package1Price, description: parsed.data.package1Description },
    { name: parsed.data.package2Name, price: parsed.data.package2Price, description: parsed.data.package2Description },
    { name: parsed.data.package3Name, price: parsed.data.package3Price, description: parsed.data.package3Description },
  ].filter((p) => p.name);

  const admin = createAdminClient();
  const { data: growthClient, error } = await admin
    .from("growth_clients")
    .update({ packages })
    .eq("id", client.id)
    .select("plan")
    .single();

  if (error || !growthClient) return { error: { _form: ["Could not save, please try again."] } };

  // Foundation has no step 6 (no Meta connection to make), so the wizard
  // ends here for them — this step is now their finish line.
  if (growthClient.plan === "foundation") {
    await admin.from("growth_clients").update({ status: "active" }).eq("id", client.id);
    await admin.from("landing_pages").update({ published: true }).eq("growth_client_id", client.id);
  }

  revalidatePath("/onboard");
  return { success: true };
}

export async function saveStep6(_prevState: OnboardState, formData: FormData): Promise<OnboardState> {
  const parsed = step6Schema.safeParse({
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

  // Step 6 is the finish line for growth_engine/enterprise, so this is
  // where their page goes live (foundation publishes back in step 5).
  await admin.from("landing_pages").update({ published: true }).eq("growth_client_id", client.id);

  revalidatePath("/onboard");
  return { success: true };
}
