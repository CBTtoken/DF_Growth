"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { testimonialSchema } from "@/lib/schemas/testimonial";
import { metaTokenSchema } from "@/lib/schemas/meta-token";
import { metaIdsSchema } from "@/lib/schemas/meta-ids";
import { encrypt } from "@/lib/crypto";

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

// Found via real UAT: a client who picked "I don't know / need help" during
// onboarding (Step6MetaConnect) had no way to add these IDs later even after
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
