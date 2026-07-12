"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import {
  step1Schema,
  step2Schema,
  step3Schema,
  templateSchema,
  step5Schema,
  step6Schema,
  step7Schema,
} from "@/lib/schemas/intake";
import { generateLandingCopy } from "@/lib/ai/draft-copy";
import { sendWelcomeEmail } from "@/lib/email/welcome";

type FieldErrors = Record<string, string[]> & { _form?: string[] };
export type OnboardState = { error?: FieldErrors; success?: boolean } | null;

// CLAUDE.md Section 6: every step is its own Server Action, auto-saving on
// submit rather than waiting for a final "finish" click, so a client can
// close the tab and resume later just by logging back in.

export async function saveStep1(_prevState: OnboardState, formData: FormData): Promise<OnboardState> {
  const parsed = step1Schema.safeParse({
    businessName: formData.get("businessName"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone") || "",
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
      business_name: parsed.data.businessName,
      contact_email: parsed.data.contactEmail,
      contact_phone: parsed.data.contactPhone || null,
    })
    .eq("id", client.id)
    .select("slug")
    .single();

  if (error) return { error: { _form: ["Could not save, please try again."] } };

  revalidatePath("/onboard");
  if (growthClient?.slug) revalidatePath(`/g/${growthClient.slug}`);
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
    productsServices: formData.get("productsServices") || "",
    additionalNotes: formData.get("additionalNotes") || "",
    facebookUrl: formData.get("facebookUrl") || "",
    instagramUrl: formData.get("instagramUrl") || "",
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
      products_services: parsed.data.productsServices || null,
      additional_notes: parsed.data.additionalNotes || null,
      facebook_url: parsed.data.facebookUrl || null,
      instagram_url: parsed.data.instagramUrl || null,
    })
    .eq("id", client.id)
    .select("business_name, slug")
    .single();

  if (error || !growthClient) return { error: { _form: ["Could not save, please try again."] } };

  const draft = await generateLandingCopy({
    businessName: growthClient.business_name,
    industry: parsed.data.industry,
    province: parsed.data.province,
    businessDescription: parsed.data.businessDescription,
    tagline: parsed.data.tagline ?? "",
    productsServices: parsed.data.productsServices ?? "",
    additionalNotes: parsed.data.additionalNotes ?? "",
  });

  if (draft) {
    await admin.from("growth_clients").update({ ai_landing_draft: draft }).eq("id", client.id);
  }

  revalidatePath("/onboard");
  if (growthClient.slug) revalidatePath(`/g/${growthClient.slug}`);
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

  // Logo is optional and handled outside the Zod schema (a File isn't a
  // string field like everything else here) — only touch logo_path if a
  // real file came through, so resubmitting this step without picking a
  // new file never clears an already-uploaded logo.
  const logo = formData.get("logo");
  let logoPath: string | null = null;
  if (logo instanceof File && logo.size > 0) {
    const ext = logo.name.split(".").pop() || "png";
    const path = `${client.id}/logo.${ext}`;
    const { error: uploadError } = await admin.storage
      .from("client-logos")
      .upload(path, logo, { contentType: logo.type, upsert: true });

    if (uploadError) {
      return { error: { _form: ["Could not upload logo — try a smaller file (under 2MB) or a different format."] } };
    }
    logoPath = path;
  }

  const { data: growthClient, error } = await admin
    .from("growth_clients")
    .update({
      brand_primary_color: parsed.data.brandPrimaryColor,
      brand_secondary_color: parsed.data.brandSecondaryColor,
      ...(logoPath ? { logo_path: logoPath } : {}),
    })
    .eq("id", client.id)
    .select("slug")
    .single();

  if (error) return { error: { _form: ["Could not save, please try again."] } };

  revalidatePath("/onboard");
  if (growthClient?.slug) revalidatePath(`/g/${growthClient.slug}`);
  return { success: true };
}

// Which of the 10 landing-page layouts (src/lib/templates/registry.ts) the
// client picked, or the literal "conversion" sentinel for the original
// hand-built layout. Always writes a real, non-null value — see the
// comment on templateSchema — so onboard/page.tsx's resume logic can tell
// "hasn't reached this step yet" (template still null) apart from
// "deliberately kept the classic layout" (template === "conversion").
export async function saveStepTemplate(_prevState: OnboardState, formData: FormData): Promise<OnboardState> {
  const parsed = templateSchema.safeParse({
    template: formData.get("template"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const client = await requireGrowthClientId();
  if (client.error) return { error: { _form: [client.error] } };

  const admin = createAdminClient();
  const { error } = await admin
    .from("growth_clients")
    .update({ template: parsed.data.template })
    .eq("id", client.id);

  if (error) return { error: { _form: ["Could not save, please try again."] } };

  revalidatePath("/onboard");
  return { success: true };
}

export async function saveStep5(_prevState: OnboardState, formData: FormData): Promise<OnboardState> {
  const parsed = step5Schema.safeParse({
    headline: formData.get("headline"),
    subheadline: formData.get("subheadline"),
    aboutText: formData.get("aboutText"),
    servicesText: formData.get("servicesText") || "",
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
    .select("slug, plan, status")
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
      services_text: parsed.data.servicesText || null,
      cta_label: parsed.data.ctaLabel,
      // The rendered landing page (Section 7.1) treats the CTA as the lead
      // form trigger, not a real navigation target — this anchor just
      // satisfies the NOT NULL constraint, it's not shown to visitors.
      cta_href: "#lead-form",
      // Step 6 (packages) is the finish line for Foundation, step 7 (Meta)
      // for growth_engine/enterprise, that's still true for first-time
      // onboarding. But this same action is now also reused by the
      // dashboard's "Edit your page" for an already-live client — an
      // unconditional false here would silently take their real, already
      // published page offline the moment they fixed a typo. Only force
      // it false for a client who was never active in the first place.
      published: growthClient.status === "active",
    },
    { onConflict: "growth_client_id,slug" }
  );

  if (landingPageError) return { error: { _form: ["Could not save, please try again."] } };

  revalidatePath("/onboard");
  if (growthClient.slug) revalidatePath(`/g/${growthClient.slug}`);
  return { success: true };
}

// Applies to every tier, unlike the Meta step — most small businesses have
// some kind of pricing structure even if they don't run ads. Entirely
// optional: an all-blank submit is valid, just stores an empty array.
export async function saveStep6(_prevState: OnboardState, formData: FormData): Promise<OnboardState> {
  const parsed = step6Schema.safeParse({
    package1Type: formData.get("package1Type") || undefined,
    package1Name: formData.get("package1Name") || "",
    package1Price: formData.get("package1Price") || "",
    package1Description: formData.get("package1Description") || "",
    package2Type: formData.get("package2Type") || undefined,
    package2Name: formData.get("package2Name") || "",
    package2Price: formData.get("package2Price") || "",
    package2Description: formData.get("package2Description") || "",
    package3Type: formData.get("package3Type") || undefined,
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
  // something we can render sensibly. Sec 5: type defaults to "package"
  // when not set (the radio always has a checked default, this is just a
  // defensive fallback for a malformed submit).
  const packages = [
    {
      type: parsed.data.package1Type ?? "package",
      name: parsed.data.package1Name,
      price: parsed.data.package1Price,
      description: parsed.data.package1Description,
    },
    {
      type: parsed.data.package2Type ?? "package",
      name: parsed.data.package2Name,
      price: parsed.data.package2Price,
      description: parsed.data.package2Description,
    },
    {
      type: parsed.data.package3Type ?? "package",
      name: parsed.data.package3Name,
      price: parsed.data.package3Price,
      description: parsed.data.package3Description,
    },
  ].filter((p) => p.name);

  const admin = createAdminClient();
  const { data: growthClient, error } = await admin
    .from("growth_clients")
    .update({ packages })
    .eq("id", client.id)
    .select("plan, status, slug, business_name, contact_email")
    .single();

  if (error || !growthClient) return { error: { _form: ["Could not save, please try again."] } };

  // Foundation has no step 7 (no Meta connection to make), so the wizard
  // ends here for them — this step is now their finish line. The 7-day free
  // trial clock starts now, when their page actually goes live, not back
  // at signup — a client who takes three days to finish onboarding still
  // gets a full 7 days of a working page.
  //
  // Gated on status !== "active" because this same action is now reused by
  // the dashboard's "Edit your page" for an already-live client — without
  // this guard, editing packages after launch would reset trial_ends_at to
  // a fresh 7 days on every single edit, letting a trial be extended
  // indefinitely just by re-saving packages. This same guard is what keeps
  // the Sprint 1 Day 0 welcome email a true one-time send, not something
  // that fires again on a later "Edit your page" package update.
  if (growthClient.plan === "foundation" && growthClient.status !== "active") {
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await admin
      .from("growth_clients")
      .update({ status: "active", trial_ends_at: trialEndsAt })
      .eq("id", client.id);
    await admin.from("landing_pages").update({ published: true }).eq("growth_client_id", client.id);
    await sendWelcomeEmail({
      businessName: growthClient.business_name,
      contactEmail: growthClient.contact_email,
      slug: growthClient.slug,
    });
  }

  revalidatePath("/onboard");
  if (growthClient.slug) revalidatePath(`/g/${growthClient.slug}`);
  return { success: true };
}

export async function saveStep7(_prevState: OnboardState, formData: FormData): Promise<OnboardState> {
  const parsed = step7Schema.safeParse({
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
  const { data: growthClient, error } =
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
          .select("business_name, contact_email, slug")
          .single()
      : await admin
          .from("growth_clients")
          .update({
            meta_pixel_id: null,
            meta_ad_account_id: null,
            meta_setup_requested_help: true,
            status: "active",
          })
          .eq("id", client.id)
          .select("business_name, contact_email, slug")
          .single();

  if (error || !growthClient) return { error: { _form: ["Could not save, please try again."] } };

  // Step 7 is the finish line for growth_engine/enterprise, so this is
  // where their page goes live (foundation publishes back in step 5). This
  // action is never reused post-launch (unlike saveStep6, "Edit your page"
  // has no Meta-connect screen), so every call here is a genuine first
  // launch — no extra guard needed before sending the Day 0 welcome email.
  await admin.from("landing_pages").update({ published: true }).eq("growth_client_id", client.id);
  await sendWelcomeEmail({
    businessName: growthClient.business_name,
    contactEmail: growthClient.contact_email,
    slug: growthClient.slug,
  });

  revalidatePath("/onboard");
  return { success: true };
}
