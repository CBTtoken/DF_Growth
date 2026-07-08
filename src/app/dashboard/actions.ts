"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { testimonialSchema } from "@/lib/schemas/testimonial";

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
