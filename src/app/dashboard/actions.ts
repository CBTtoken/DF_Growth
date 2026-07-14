"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { testimonialSchema } from "@/lib/schemas/testimonial";
import { metaTokenSchema } from "@/lib/schemas/meta-token";
import { metaIdsSchema } from "@/lib/schemas/meta-ids";
import { domainVerificationSchema } from "@/lib/schemas/domain-verification";
import { encrypt } from "@/lib/crypto";
import { findActiveSubscription, disableSubscription } from "@/lib/paystack/subscriptions";
import { templateSchema } from "@/lib/schemas/intake";
import { socialAssetSchema } from "@/lib/schemas/social-asset";
import { isRateLimited } from "@/lib/rate-limit";
import crypto from "crypto";

const PHOTO_CAP = 10;

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

// Combined spec Sec 25: the generic counterpart to addTestimonial above,
// for the four new content types — nothing stored beyond the resulting
// image (no testimonials-style row to key off), same generated_assets
// table and same "generate once on submit, not on every future view"
// approach.
//
// Public Beta Polish Sprint Sec 9: root cause of the reported bug, found by
// bisecting down to a minimal repro against next/og directly — two
// independent, fully silent Satori rendering gaps (see the comment on
// ImageBackground in lib/assets/styles.tsx for the full story: a plain
// <img> element rendered nothing at all, and separately the `inset: 0` CSS
// shorthand silently collapsed the element it was set on). Fixing those
// two makes remote image URLs render correctly — but routing through
// Next's own image-optimizer proxy (`/_next/image?url=...`) as originally
// tried here turned out to have a *third* failure mode: on a cold cache
// (the first time any given photo is used), Next's on-demand resize is
// slow enough that Satori's own internal fetch of that proxy URL times out
// and silently skips the image again — confirmed live, flaky pass/fail on
// the exact same request depending on whether that URL had been requested
// before. Fetching the source image once here and embedding it directly as
// a data URI removes that dependency entirely: Satori never fetches
// anything externally, so there's nothing left to race or time out on.
async function validateAndInlineImage(url: string): Promise<{ url: string } | { error: string }> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    return { error: "Could not load that photo, please choose a different one." };
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok || !contentType.startsWith("image/")) {
    return { error: "Could not load that photo, please choose a different one." };
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return { url: `data:${contentType};base64,${buffer.toString("base64")}` };
}

export async function generateSocialAsset(_prevState: DashboardState, formData: FormData): Promise<DashboardState> {
  const parsed = socialAssetSchema.safeParse({
    contentType: formData.get("contentType"),
    headline: formData.get("headline"),
    subtext: formData.get("subtext") || "",
    imageUrl: formData.get("imageUrl") || "",
    beforeImageUrl: formData.get("beforeImageUrl") || "",
    afterImageUrl: formData.get("afterImageUrl") || "",
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const client = await requireGrowthClientId();
  if (client.error) return { error: { _form: [client.error] } };

  // Public Beta Polish Sprint Sec 13.5: rendering + uploading an image is
  // real, per-call cost — keyed by client id, not IP, since this requires
  // an authenticated session (unlike the public forms elsewhere), and a
  // legitimate business owner shouldn't get IP-blocked for generating a
  // batch of assets from the same network as other users on shared wifi.
  // 20/hour comfortably covers real use (several posts across a session)
  // while stopping a scripted loop from running this expensive path.
  if (isRateLimited(`generate-asset:${client.id}`, 20, 60 * 60 * 1000)) {
    return { error: { _form: ["You've generated a lot of images recently — please wait a bit and try again."] } };
  }

  if (parsed.data.contentType === "before-after" && (!parsed.data.beforeImageUrl || !parsed.data.afterImageUrl)) {
    return { error: { _form: ["Choose both a before and an after photo."] } };
  }

  const admin = createAdminClient();
  const { data: growthClient } = await admin
    .from("growth_clients")
    .select("business_name, brand_primary_color, brand_secondary_color, asset_style")
    .eq("id", client.id)
    .single();

  if (!growthClient) return { error: { _form: ["Could not find your account, please try again."] } };

  const primaryColor = growthClient.brand_primary_color ?? "#1081b8";
  const secondaryColor = growthClient.brand_secondary_color ?? "#ffffff";
  const style = growthClient.asset_style ?? "clean";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  // Public Beta Polish Sprint Sec 9: validate + inline every source image
  // as a data URI before it ever reaches the generation route — see the
  // comment on validateAndInlineImage above for why.
  let inlineImageUrl: string | undefined;
  let inlineBeforeUrl: string | undefined;
  let inlineAfterUrl: string | undefined;

  if (parsed.data.imageUrl) {
    const result = await validateAndInlineImage(parsed.data.imageUrl);
    if ("error" in result) return { error: { _form: [result.error] } };
    inlineImageUrl = result.url;
  }
  if (parsed.data.contentType === "before-after") {
    const [beforeResult, afterResult] = await Promise.all([
      validateAndInlineImage(parsed.data.beforeImageUrl!),
      validateAndInlineImage(parsed.data.afterImageUrl!),
    ]);
    if ("error" in beforeResult) return { error: { _form: [`Before photo: ${beforeResult.error}`] } };
    if ("error" in afterResult) return { error: { _form: [`After photo: ${afterResult.error}`] } };
    inlineBeforeUrl = beforeResult.url;
    inlineAfterUrl = afterResult.url;
  }

  try {
    const imageRes = await fetch(`${siteUrl}/api/og/asset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentType: parsed.data.contentType,
        style,
        headline: parsed.data.headline,
        subtext: parsed.data.subtext,
        businessName: growthClient.business_name,
        primaryColor,
        secondaryColor,
        imageUrl: inlineImageUrl ?? null,
        beforeImageUrl: inlineBeforeUrl,
        afterImageUrl: inlineAfterUrl,
      }),
    });

    if (!imageRes.ok) {
      return { error: { _form: ["Could not generate that image, please try again."] } };
    }

    const imageBytes = await imageRes.arrayBuffer();
    // Sanity floor: distinguishes a genuine render failure from a normal
    // no-photo text-only asset (which is also a legitimately small PNG) —
    // this only fires when a photo was actually requested but the bytes
    // came back suspiciously tiny for a 1080x1080 image with a real photo
    // behind it, closing the loop on any remaining silent-failure surface.
    const expectedPhoto = Boolean(inlineImageUrl || inlineBeforeUrl);
    if (expectedPhoto && imageBytes.byteLength < 50000) {
      return { error: { _form: ["Could not generate that image, please try again."] } };
    }
    const path = `${client.id}/${parsed.data.contentType}-${crypto.randomUUID()}.png`;
    const { error: uploadError } = await admin.storage
      .from("generated-assets")
      .upload(path, imageBytes, { contentType: "image/png" });

    if (uploadError) {
      return { error: { _form: ["Could not save that image, please try again."] } };
    }

    const { error: insertError } = await admin.from("generated_assets").insert({
      growth_client_id: client.id,
      testimonial_id: null,
      template: `${parsed.data.contentType}-square`,
      image_path: path,
    });

    // Public Beta Polish Sprint Sec 9: found live while verifying this
    // section — this error was never checked, so a failed insert (the
    // image genuinely rendered and uploaded fine) still reported success,
    // leaving a real file in Storage with no generated_assets row pointing
    // at it — invisible in the dashboard gallery forever. Exactly the
    // silent-failure shape this section exists to close off.
    if (insertError) {
      console.error("Failed to record generated asset", insertError);
      return { error: { _form: ["Could not save that image, please try again."] } };
    }
  } catch (err) {
    console.error("Failed to generate social asset", err);
    return { error: { _form: ["Could not generate that image, please try again."] } };
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
  if (growthClient?.slug) revalidatePath(`/${growthClient.slug}`);
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

// Found via real UAT: "sometimes for Google business page, they require to
// add a header or something to verify their webpage, same with Facebook
// pixel linking, is it possible to build this in?" Google Search Console and
// Meta Business domain verification both boil down to a single meta tag with
// a client-provided code, injected into the public page's <head> — see
// generateMetadata in /[clientSlug]/page.tsx for where these actually get
// used. Both fields optional and independent, saving one doesn't require
// the other.
export async function saveDomainVerification(
  _prevState: DashboardState,
  formData: FormData
): Promise<DashboardState> {
  const parsed = domainVerificationSchema.safeParse({
    googleSiteVerification: formData.get("googleSiteVerification"),
    facebookDomainVerification: formData.get("facebookDomainVerification"),
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
      google_site_verification: parsed.data.googleSiteVerification,
      facebook_domain_verification: parsed.data.facebookDomainVerification,
    })
    .eq("id", client.id)
    .select("slug")
    .single();

  if (error) return { error: { _form: ["Could not save, please try again."] } };

  revalidatePath("/dashboard");
  if (growthClient?.slug) revalidatePath(`/${growthClient.slug}`);
  return { success: true };
}

// Real client photos for use in landing page templates (starting with
// Left-Split's media showcase), separate from the single logo upload.
// Capped at 10 — enough for a real gallery without turning this into a
// full media library, and small enough that a client can meaningfully
// review what they've uploaded at a glance.
// Accepts several files in one submission (the file input allows multi-
// select) rather than requiring one upload round-trip per photo — found
// via real UAT that only being able to add one at a time was real friction
// for someone with a phone full of business photos to add.
export async function uploadClientPhoto(_prevState: DashboardState, formData: FormData): Promise<DashboardState> {
  const client = await requireGrowthClientId();
  if (client.error) return { error: { _form: [client.error] } };

  const files = formData.getAll("photo").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { error: { _form: ["Choose at least one photo to upload."] } };
  }

  const admin = createAdminClient();
  const { count } = await admin
    .from("client_photos")
    .select("id", { count: "exact", head: true })
    .eq("growth_client_id", client.id);

  let nextPosition = count ?? 0;
  const room = PHOTO_CAP - nextPosition;

  if (room <= 0) {
    return { error: { _form: [`You've reached the ${PHOTO_CAP}-photo limit. Delete one first to add another.`] } };
  }

  const toUpload = files.slice(0, room);
  let failed = 0;

  for (const photo of toUpload) {
    const ext = photo.name.split(".").pop() || "jpg";
    const path = `${client.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await admin.storage
      .from("client-photos")
      .upload(path, photo, { contentType: photo.type });

    if (uploadError) {
      failed++;
      continue;
    }

    const { error: insertError } = await admin
      .from("client_photos")
      .insert({ growth_client_id: client.id, storage_path: path, position: nextPosition });

    if (insertError) {
      failed++;
      continue;
    }
    nextPosition++;
  }

  revalidatePath("/dashboard");
  // Sprint 1, Build Item 11: this action is now also called from the
  // onboarding wizard's photo step, not just the dashboard — revalidating
  // only /dashboard meant a photo uploaded mid-onboarding never actually
  // appeared until the next full page load.
  revalidatePath("/onboard");

  if (failed > 0) {
    return { error: { _form: [`${failed} photo${failed > 1 ? "s" : ""} couldn't be uploaded, try a smaller file or a different format.`] } };
  }
  if (files.length > toUpload.length) {
    return {
      error: {
        _form: [`Uploaded ${toUpload.length}, but ${files.length - toUpload.length} were skipped, you're at the ${PHOTO_CAP}-photo limit.`],
      },
    };
  }
  return { success: true };
}

// Combined spec Sec 24: the Pexels picker (PexelsPicker.tsx) only ever
// hands this a URL to one of Pexels' own hosted images, never a file — so
// "adding" a Pexels photo means downloading it once, server-side, and
// storing it exactly like an uploaded one, in the same bucket and table.
// Everything downstream (the gallery, hero-photo selection, the public
// page) then treats a Pexels-sourced photo identically to a client's own
// upload, no separate code path needed anywhere else.
export async function addPhotoFromPexels(_prevState: DashboardState, formData: FormData): Promise<DashboardState> {
  const client = await requireGrowthClientId();
  if (client.error) return { error: { _form: [client.error] } };

  const photoUrl = formData.get("photoUrl");
  // Pexels' own CDN domain only — this fetches a server-supplied URL from
  // formData, so restricting it to a known-safe host prevents it being
  // used as an open fetch-anything-and-store-it proxy.
  if (typeof photoUrl !== "string" || !/^https:\/\/images\.pexels\.com\//.test(photoUrl)) {
    return { error: { _form: ["Invalid photo."] } };
  }

  const admin = createAdminClient();
  const { count } = await admin
    .from("client_photos")
    .select("id", { count: "exact", head: true })
    .eq("growth_client_id", client.id);

  const nextPosition = count ?? 0;
  if (nextPosition >= PHOTO_CAP) {
    return { error: { _form: [`You've reached the ${PHOTO_CAP}-photo limit. Delete one first to add another.`] } };
  }

  let imageRes: Response;
  try {
    imageRes = await fetch(photoUrl);
  } catch {
    return { error: { _form: ["Could not fetch that photo, please try again."] } };
  }
  if (!imageRes.ok) {
    return { error: { _form: ["Could not fetch that photo, please try again."] } };
  }

  const contentType = imageRes.headers.get("content-type") ?? "image/jpeg";
  const ext = contentType.includes("png") ? "png" : "jpg";
  const path = `${client.id}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await imageRes.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from("client-photos")
    .upload(path, buffer, { contentType });

  if (uploadError) return { error: { _form: ["Could not save that photo, please try again."] } };

  const { error: insertError } = await admin
    .from("client_photos")
    .insert({ growth_client_id: client.id, storage_path: path, position: nextPosition });

  if (insertError) return { error: { _form: ["Could not save that photo, please try again."] } };

  revalidatePath("/dashboard");
  revalidatePath("/onboard");
  return { success: true };
}

export async function deleteClientPhoto(_prevState: DashboardState, formData: FormData): Promise<DashboardState> {
  const client = await requireGrowthClientId();
  if (client.error) return { error: { _form: [client.error] } };

  const photoId = formData.get("photoId");
  if (typeof photoId !== "string") return { error: { _form: ["Missing photo."] } };

  const admin = createAdminClient();
  // Scoped to this client's own id, not just the photo id, otherwise any
  // logged-in user could delete any other client's photo by guessing a
  // UUID, since this runs with the service role and bypasses RLS.
  const { data: photo } = await admin
    .from("client_photos")
    .select("storage_path")
    .eq("id", photoId)
    .eq("growth_client_id", client.id)
    .single();

  if (!photo) return { error: { _form: ["Photo not found."] } };

  await admin.storage.from("client-photos").remove([photo.storage_path]);
  const { error } = await admin.from("client_photos").delete().eq("id", photoId).eq("growth_client_id", client.id);

  if (error) return { error: { _form: ["Could not delete photo, please try again."] } };

  revalidatePath("/dashboard");
  revalidatePath("/onboard");
  return { success: true };
}

// Combined spec Sec 7: the hero background image used to just be "whichever
// gallery photo was uploaded first" — no client control, and the wrong
// photo for a hero banner (a receipt, a close-up, anything not meant to be
// a wide background) would end up cropped and cut off on the live page.
// This is the explicit opt-in action instead: a client picks one photo, by
// id, from their own gallery. Passing null clears the selection and falls
// back to the Pexels stock photo, same as having zero gallery photos.
export async function setHeroPhoto(_prevState: DashboardState, formData: FormData): Promise<DashboardState> {
  const client = await requireGrowthClientId();
  if (client.error) return { error: { _form: [client.error] } };

  const raw = formData.get("photoId");
  const photoId = typeof raw === "string" && raw.length > 0 ? raw : null;
  const admin = createAdminClient();

  if (photoId) {
    // Confirms the photo actually belongs to this client before pointing
    // hero_photo_id at it — otherwise a logged-in user could set another
    // client's photo id as their own hero image by guessing a UUID, since
    // this runs with the service role and bypasses RLS.
    const { data: photo } = await admin
      .from("client_photos")
      .select("id")
      .eq("id", photoId)
      .eq("growth_client_id", client.id)
      .maybeSingle();
    if (!photo) return { error: { _form: ["Photo not found."] } };
  }

  const { data: growthClient, error } = await admin
    .from("growth_clients")
    .update({ hero_photo_id: photoId })
    .eq("id", client.id)
    .select("slug")
    .single();

  if (error) return { error: { _form: ["Could not save, please try again."] } };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/preview");
  if (growthClient?.slug) revalidatePath(`/${growthClient.slug}`);
  return { success: true };
}

// Sets the default visual style for future auto-generated testimonial
// images (src/lib/assets/styles.tsx) — mirrors changeTemplate's pattern.
// Only ever affects assets generated after this changes; existing
// downloaded images keep whatever style they were made with, same as
// changing a landing page template doesn't retroactively alter anything
// a client already downloaded.
export async function changeAssetStyle(_prevState: DashboardState, formData: FormData): Promise<DashboardState> {
  const style = formData.get("style");
  if (typeof style !== "string" || !["clean", "bold-quote", "star-card", "mono-badge"].includes(style)) {
    return { error: { _form: ["Invalid style."] } };
  }

  const client = await requireGrowthClientId();
  if (client.error) return { error: { _form: [client.error] } };

  const admin = createAdminClient();
  const { error } = await admin.from("growth_clients").update({ asset_style: style }).eq("id", client.id);

  if (error) return { error: { _form: ["Could not save, please try again."] } };

  revalidatePath("/dashboard");
  return { success: true };
}

// Combined spec Sec 28: there was no way at all to end a session — a
// shared/borrowed device stayed signed in indefinitely. Server Action (not
// a client-side supabase.auth.signOut() call) so the auth cookie is cleared
// server-side, matching how the rest of this app treats session state.
export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
