"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { testimonialSchema } from "@/lib/schemas/testimonial";
import { metaTokenSchema } from "@/lib/schemas/meta-token";
import { metaIdsSchema } from "@/lib/schemas/meta-ids";
import { encrypt } from "@/lib/crypto";
import { findActiveSubscription, disableSubscription } from "@/lib/paystack/subscriptions";
import { templateSchema } from "@/lib/schemas/intake";

type DashboardState = { error?: Record<string, string[]> & { _form?: string[] }; success?: boolean } | null;

// CLAUDE.md Section 8: generate the social asset once, when the testimonial
// is submitted, and cache it in generated_assets — not regenerated on every
// future view/download.
export async function addTestimonial(
  _prevState: DashboardState,
  formData: FormData
): Promise<DashboardState> {
  const parsed = testimonialSchema.safeParse({
    authorName: formData.get("authorName"),
    quote: formData.get("quote"),
    rating: formData.get("rating") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const client = await requireGrowthClientId();
  if (client.error) return { error: { _form: [client.error] } };

  const admin = createAdminClient();
  const { data: testimonial, error: insertError } = await admin
    .from("testimonials")
    .insert({
      growth_client_id: client.id,
      author_name: parsed.data.authorName,
      quote: parsed.data.quote,
      rating: parsed.data.rating ? Number(parsed.data.rating) : null,
    })
    .select("id")
    .single();

  if (insertError || !testimonial) {
    return { error: { _form: ["Could not save, please try again."] } };
  }

  // Best-effort: a failure here shouldn't lose the testimonial the client
  // just wrote. Asset generation can be retried later if needed.
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const imageRes = await fetch(`${siteUrl}/api/og/testimonial/${testimonial.id}`);
    if (imageRes.ok) {
      const imageBytes = await imageRes.arrayBuffer();
      const path = `${client.id}/${testimonial.id}.png`;
      const { error: uploadError } = await admin.storage
        .from("generated-assets")
        .upload(path, imageBytes, { contentType: "image/png", upsert: true });

      if (!uploadError) {
        await admin.from("generated_assets").insert({
          growth_client_id: client.id,
          testimonial_id: testimonial.id,
          template: "testimonial-square",
          image_path: path,
        });
      } else {
        console.error("Failed to upload generated asset", uploadError);
      }
    }
  } catch (err) {
    console.error("Failed to generate testimonial asset", err);
  }

  revalidatePath("/dashboard");
  return { success: true };
}

// CLAUDE.md Section 3/9: no OAuth "Connect with Meta" flow exists (would
// need a Meta App through App Review), so the client — or DigitalFlyer's
// team on their behalf, per Growth Engine's "managed campaign monitoring" —
// pastes in a token generated from Meta Business Settings directly. Never
// stored in plaintext.
export async function saveMetaToken(
  _prevState: DashboardState,
  formData: FormData
): Promise<DashboardState> {
  const parsed = metaTokenSchema.safeParse({
    accessToken: formData.get("accessToken"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const client = await requireGrowthClientId();
  if (client.error) return { error: { _form: [client.error] } };

  const admin = createAdminClient();
  const { error } = await admin.from("growth_client_secrets").upsert(
    {
      growth_client_id: client.id,
      meta_capi_access_token_encrypted: encrypt(parsed.data.accessToken),
    },
    { onConflict: "growth_client_id" }
  );

  if (error) return { error: { _form: ["Could not save, please try again."] } };

  revalidatePath("/dashboard");
  return { success: true };
}

// The pricing/marketing copy promises self-serve cancellation with no
// long-term contract — this is what actually makes that true, rather than
// leaving it as a claim someone has to email in to act on.
// paystack_subscription_code was never actually captured at signup (see
// the webhook's own comment), so this looks the subscription up live by
// the client's own email instead of trusting a stored code that mostly
// doesn't exist yet. A Foundation client still on their free trial has no
// Paystack subscription at all — that's a valid case, not an error, it
// just means there's nothing to disable before marking the account
// cancelled.
export async function cancelSubscription(_prevState: DashboardState, _formData: FormData): Promise<DashboardState> {
  const client = await requireGrowthClientId();
  if (client.error) return { error: { _form: [client.error] } };

  const admin = createAdminClient();
  const { data: growthClient } = await admin
    .from("growth_clients")
    .select("contact_email")
    .eq("id", client.id)
    .single();

  if (!growthClient?.contact_email) return { error: { _form: ["Could not find your account, please try again."] } };

  const subscription = await findActiveSubscription(growthClient.contact_email);
  if (subscription) {
    const result = await disableSubscription(subscription.subscriptionCode, subscription.emailToken);
    if (!result.ok) {
      console.error("Failed to disable Paystack subscription", result.error);
      return { error: { _form: ["Could not cancel your subscription with Paystack, please try again or contact us."] } };
    }
  }

  const { error } = await admin.from("growth_clients").update({ status: "cancelled" }).eq("id", client.id);
  if (error) return { error: { _form: ["Could not update your account, please try again."] } };

  revalidatePath("/dashboard");
  return { success: true };
}

// Found via real UAT: the onboarding picker was a one-shot, irreversible
// choice — a client who picked wrong (or just changed their mind) had no
// way back in without asking us to do it manually. Reuses the exact same
// templateSchema/TemplateGallery as onboarding step 4, just a different
// save path and revalidation target (the live public page, not /onboard).
export async function changeTemplate(_prevState: DashboardState, formData: FormData): Promise<DashboardState> {
  const parsed = templateSchema.safeParse({ template: formData.get("template") });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const client = await requireGrowthClientId();
  if (client.error) return { error: { _form: [client.error] } };

  const admin = createAdminClient();
  const { data: growthClient, error } = await admin
    .from("growth_clients")
    .update({ template: parsed.data.template })
    .eq("id", client.id)
    .select("slug")
    .single();

  if (error) return { error: { _form: ["Could not save, please try again."] } };

  revalidatePath("/dashboard");
  if (growthClient?.slug) revalidatePath(`/g/${growthClient.slug}`);
  return { success: true };
}

// Found via real UAT: a client who picked "I don't know / need help" during
// onboarding (Step7MetaConnect) had no way to add these IDs later even after
// finding them, and no confirmation anywhere that their help request had
// actually been captured — the dashboard's Meta section was hidden entirely
// whenever meta_pixel_id was null, which was every "I don't know" client,
// forever. This gives them a self-serve path alongside the "we'll reach out"
// promise, rather than that promise being the only option.
export async function saveMetaIds(_prevState: DashboardState, formData: FormData): Promise<DashboardState> {
  const parsed = metaIdsSchema.safeParse({
    metaPixelId: formData.get("metaPixelId"),
    metaAdAccountId: formData.get("metaAdAccountId"),
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
      meta_pixel_id: parsed.data.metaPixelId,
      meta_ad_account_id: parsed.data.metaAdAccountId,
      meta_setup_requested_help: false,
    })
    .eq("id", client.id);

  if (error) return { error: { _form: ["Could not save, please try again."] } };

  revalidatePath("/dashboard");
  return { success: true };
}
