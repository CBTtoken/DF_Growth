"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import {
  shopProductSchema,
  shopVariantSchema,
  shopCsvRowSchema,
  shopCouponSchema,
  shopCollectionAddressSchema,
  shopDeliverySchema,
} from "@/lib/schemas/shop";
import { encrypt } from "@/lib/crypto";
import { verifyBobGoToken } from "@/lib/bobgo/client";
import { uniqueProductSlug } from "@/lib/shop/product-slug";
import { slugify } from "@/lib/slugify";

type ActionState = { error?: Record<string, string[]> & { _form?: string[] }; success?: boolean } | null;
type ActionResult = { error?: string; success?: boolean };

async function revalidateOwnPage(clientId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("growth_clients").select("slug").eq("id", clientId).single();
  revalidatePath("/dashboard");
  if (data?.slug) {
    revalidatePath(`/${data.slug}`);
    // The storefront and every product page under it. Without this a member
    // edits a price, looks at their own shop, sees the old one for up to a
    // minute and concludes the save did not work. "layout" covers the whole
    // subtree in one call rather than needing a path per product.
    revalidatePath(`/${data.slug}/shop`, "layout");
  }
}

export async function setShopEnabled(enabled: boolean): Promise<ActionResult> {
  const client = await requireGrowthClientId();
  if (client.error !== undefined) return { error: client.error };

  const admin = createAdminClient();
  await admin.from("growth_clients").update({ shop_enabled: enabled }).eq("id", client.id);
  await revalidateOwnPage(client.id);
  return { success: true };
}

export async function saveCollectionAddress(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const client = await requireGrowthClientId();
  if (client.error !== undefined) return { error: { _form: [client.error] } };

  const parsed = shopCollectionAddressSchema.safeParse({
    line1: formData.get("line1"),
    city: formData.get("city"),
    postalCode: formData.get("postalCode"),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const admin = createAdminClient();
  await admin
    .from("growth_clients")
    .update({ shop_collection_address: parsed.data })
    .eq("id", client.id);
  await revalidateOwnPage(client.id);
  return { success: true };
}

/**
 * Saves what this member charges for delivery.
 *
 * Checkout charged R0 before this existed, with a comment promising live
 * Bob Go rates in a later sprint. That default was not neutral: it handed
 * the member's own courier bill back to them on every sale, silently.
 *
 * Stored in cents, like every other amount in this codebase, so that a
 * delivery charge cannot be the one place a rounding error lives.
 */
export async function saveShopDelivery(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const client = await requireGrowthClientId();
  if (client.error !== undefined) return { error: { _form: [client.error] } };

  // An empty box means "no free delivery offer", not zero.
  const rawFree = String(formData.get("freeDeliveryOver") ?? "").trim();

  const parsed = shopDeliverySchema.safeParse({
    mode: formData.get("mode") || "flat",
    flatDelivery: formData.get("flatDelivery") || 0,
    freeDeliveryOver: rawFree === "" ? null : rawFree,
  });
  if (!parsed.success) {
    const issues = parsed.error.flatten();
    return {
      error: {
        _form: [issues.fieldErrors.flatDelivery?.[0] ?? issues.fieldErrors.freeDeliveryOver?.[0] ?? "Could not save, please try again."],
      },
    };
  }

  // Collection only and quote on request both mean nothing is added to the
  // order, so the two amounts are zeroed rather than left lying around
  // waiting to be charged if the member ever switches back to a flat rate
  // without noticing what is still in the boxes.
  const chargesDelivery = parsed.data.mode === "flat";

  const admin = createAdminClient();
  const { error } = await admin
    .from("growth_clients")
    .update({
      shop_delivery_mode: parsed.data.mode,
      shop_flat_delivery_cents: chargesDelivery ? Math.round(parsed.data.flatDelivery * 100) : 0,
      shop_free_delivery_over_cents:
        chargesDelivery && parsed.data.freeDeliveryOver != null
          ? Math.round(parsed.data.freeDeliveryOver * 100)
          : null,
    })
    .eq("id", client.id);

  if (error) return { error: { _form: ["Could not save, please try again."] } };

  await revalidateOwnPage(client.id);
  return { success: true };
}

/**
 * Connects a member's own Bob Go account to their shop.
 *
 * Dewald, 2026-07-30: "we will not let members use our account, they will
 * have to get their own accounts." So this stores the member's own bearer
 * token, and from then on every rate and every waybill happens on their
 * account, billed to them, in their name.
 *
 * The token is verified by actually using it before anything is saved. A
 * token that merely looks like a token proves nothing, and the moment to
 * discover it is wrong is while the member is looking at the screen that
 * asked for it, not at a stranger's checkout three days later.
 *
 * It is never returned to the browser afterwards, not even masked. There is
 * nothing the dashboard needs it for, and a field that can display a secret
 * is a field that can leak one.
 */
export async function connectBobGo(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const client = await requireGrowthClientId();
  if (client.error !== undefined || !client.id) return { error: { _form: [client.error ?? "Not signed in"] } };

  const token = String(formData.get("bobgoToken") ?? "").trim();
  const sandbox = formData.get("bobgoSandbox") === "on";

  if (!token) return { error: { _form: ["Paste the API token from your Bob Go account."] } };

  const verified = await verifyBobGoToken(token, sandbox);
  if (!verified.ok) {
    return {
      error: {
        _form: [
          `${verified.error} Check you copied the whole token, and that it is from ${sandbox ? "your sandbox" : "your live"} Bob Go account.`,
        ],
      },
    };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error: secretError } = await admin
    .from("growth_client_secrets")
    .upsert(
      { growth_client_id: client.id, bobgo_token_encrypted: encrypt(token), updated_at: now },
      { onConflict: "growth_client_id" }
    );

  if (secretError) {
    console.error("Could not store Bob Go token", secretError);
    return { error: { _form: ["Could not save, please try again."] } };
  }

  await admin
    .from("growth_clients")
    .update({
      bobgo_connected_at: now,
      bobgo_sandbox: sandbox,
      bobgo_last_error: null,
      bobgo_last_error_at: null,
    })
    .eq("id", client.id);

  await revalidateOwnPage(client.id);
  return { success: true };
}

/**
 * Disconnects, and actually removes the token rather than just hiding it.
 *
 * A member who disconnects has withdrawn permission for us to spend money
 * on their account. Leaving the credential in the database and merely
 * flagging the account as disconnected would be keeping a key we were asked
 * to give back.
 */
export async function disconnectBobGo(): Promise<ActionResult> {
  const client = await requireGrowthClientId();
  if (client.error !== undefined || !client.id) return { error: client.error ?? "Not signed in" };

  const admin = createAdminClient();

  await admin
    .from("growth_client_secrets")
    .update({ bobgo_token_encrypted: null, updated_at: new Date().toISOString() })
    .eq("growth_client_id", client.id);

  await admin
    .from("growth_clients")
    .update({ bobgo_connected_at: null, bobgo_last_error: null, bobgo_last_error_at: null })
    .eq("id", client.id);

  await revalidateOwnPage(client.id);
  return { success: true };
}

/**
 * Creating or editing a product.
 *
 * Handoff acceptance criterion 8: "A member can add a product with images
 * and variants from a phone without help." Which is why the required fields
 * are down to a title and a price. A SKU is generated when one is not given,
 * and the four courier measurements are optional (see lib/schemas/shop.ts
 * for why, and for what still tells the member they matter).
 *
 * The URL is set once, on create, and never regenerated. A product page URL
 * is what a member pastes into a WhatsApp message, and those messages sit in
 * threads for months, so changing it because somebody fixed a typo in the
 * title would silently break every one of them.
 */
export async function saveProduct(
  productId: string | null,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const client = await requireGrowthClientId();
  if (client.error !== undefined || !client.id) return { error: { _form: [client.error ?? "Not signed in"] } };

  const parsed = shopProductSchema.safeParse({
    title: formData.get("title"),
    sku: formData.get("sku") || undefined,
    description: formData.get("description") || undefined,
    basePrice: formData.get("basePrice"),
    weightKg: formData.get("weightKg") || 0,
    lengthCm: formData.get("lengthCm") || 0,
    widthCm: formData.get("widthCm") || 0,
    heightCm: formData.get("heightCm") || 0,
    stockQuantity: formData.get("stockQuantity") || 0,
    trackStock: formData.get("trackStock") ?? false,
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const admin = createAdminClient();
  const productRow = {
    growth_client_id: client.id,
    title: parsed.data.title,
    description: parsed.data.description || null,
    base_price_cents: Math.round(parsed.data.basePrice * 100),
    weight_kg: parsed.data.weightKg,
    length_cm: parsed.data.lengthCm,
    width_cm: parsed.data.widthCm,
    height_cm: parsed.data.heightCm,
    track_stock: parsed.data.trackStock,
    updated_at: new Date().toISOString(),
  };

  const duplicateSku = (message: string | undefined) =>
    message?.includes("shop_products_growth_client_id_sku_key")
      ? "You already have a product with that code."
      : "Could not save, please try again.";

  if (productId) {
    // The slug is deliberately absent from this update.
    const { error } = await admin
      .from("shop_products")
      .update({ ...productRow, ...(parsed.data.sku ? { sku: parsed.data.sku } : {}) })
      .eq("id", productId)
      .eq("growth_client_id", client.id);
    if (error) return { error: { _form: [duplicateSku(error.message)] } };

    // Stock lives on the variants. A product with named options has its
    // stock edited per option, so this only touches the single unnamed
    // variant that a plain product carries. Found in JS rather than filtered
    // on in Postgrest: descriptor is jsonb, and an equality filter against
    // an empty object there is the kind of thing that works until somebody
    // saves {} a slightly different way.
    const { data: variants } = await admin
      .from("shop_product_variants")
      .select("id, descriptor")
      .eq("shop_product_id", productId)
      .eq("growth_client_id", client.id);

    const plain = (variants ?? []).find(
      (v) => Object.keys((v.descriptor as Record<string, string>) ?? {}).length === 0
    );

    if (plain) {
      await admin
        .from("shop_product_variants")
        .update({ stock_quantity: parsed.data.stockQuantity, updated_at: new Date().toISOString() })
        .eq("id", plain.id);
    }
  } else {
    const slug = await uniqueProductSlug(client.id, parsed.data.title);
    const sku = parsed.data.sku || generatedSku(parsed.data.title);

    const { data: product, error } = await admin
      .from("shop_products")
      .insert({ ...productRow, slug, sku, status: "active" as const })
      .select("id")
      .single();

    if (error || !product) return { error: { _form: [duplicateSku(error?.message)] } };

    await admin.from("shop_product_variants").insert({
      growth_client_id: client.id,
      shop_product_id: product.id,
      sku,
      stock_quantity: parsed.data.stockQuantity,
    });
  }

  await revalidateOwnPage(client.id);
  return { success: true };
}

/**
 * A stock code for a member who does not have one.
 *
 * Only ever used when the field is left blank. The random tail is what
 * stops two products called "Beaded bracelet" colliding on the per-member
 * unique constraint and handing the member a database error in place of
 * their second product.
 */
function generatedSku(title: string): string {
  const base = slugify(title).slice(0, 40).toUpperCase() || "ITEM";
  return `${base}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/**
 * Which products appear on the landing page.
 *
 * Handoff Sec 1.1: the member chooses. There is no automatic option and
 * there will not be one until real order data exists, because ranking by
 * sales on a shop with no sales is a claim dressed up as data.
 */
export async function toggleProductFeatured(productId: string, featured: boolean): Promise<ActionResult> {
  const client = await requireGrowthClientId();
  if (client.error !== undefined) return { error: client.error };

  const admin = createAdminClient();
  await admin
    .from("shop_products")
    .update({ is_featured: featured, updated_at: new Date().toISOString() })
    .eq("id", productId)
    .eq("growth_client_id", client.id);

  await revalidateOwnPage(client.id);
  return { success: true };
}

// ============================================================
// Product images
// ============================================================

const IMAGE_CAP = 6;

/**
 * A photo of the thing being sold.
 *
 * shop_products.image_paths has existed since the shop was built and has
 * been an empty array on every row ever created, because nothing ever
 * uploaded to it. Products have been sold as a line of text and a number.
 *
 * One file per request rather than several. The same lesson as the client
 * photo gallery: a batch of five photos from a modern phone camera blows
 * past the Server Action body limit and the whole request is rejected
 * before it reaches this code, which looks to the member like a button that
 * does nothing.
 */
export async function uploadProductImage(productId: string, formData: FormData): Promise<ActionResult> {
  const client = await requireGrowthClientId();
  if (client.error !== undefined || !client.id) return { error: client.error ?? "Not signed in" };

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a picture first." };
  if (file.size > 5 * 1024 * 1024) return { error: "That picture is over 5MB. Try a smaller one." };

  const admin = createAdminClient();
  const { data: product } = await admin
    .from("shop_products")
    .select("id, image_paths")
    .eq("id", productId)
    .eq("growth_client_id", client.id)
    .maybeSingle();

  if (!product) return { error: "Could not find that product." };

  const paths = (Array.isArray(product.image_paths) ? product.image_paths : []) as string[];
  if (paths.length >= IMAGE_CAP) {
    return { error: `You can have ${IMAGE_CAP} pictures per product. Remove one to add another.` };
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${client.id}/${productId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await admin.storage
    .from("shop-products")
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    console.error("Product image upload failed", uploadError);
    return { error: "That picture could not be uploaded. Try a JPG, PNG or WebP." };
  }

  await admin
    .from("shop_products")
    .update({ image_paths: [...paths, path], updated_at: new Date().toISOString() })
    .eq("id", productId)
    .eq("growth_client_id", client.id);

  await revalidateOwnPage(client.id);
  return { success: true };
}

/** Removes a picture from the product and from storage, in that order. */
export async function removeProductImage(productId: string, path: string): Promise<ActionResult> {
  const client = await requireGrowthClientId();
  if (client.error !== undefined || !client.id) return { error: client.error ?? "Not signed in" };

  const admin = createAdminClient();
  const { data: product } = await admin
    .from("shop_products")
    .select("id, image_paths")
    .eq("id", productId)
    .eq("growth_client_id", client.id)
    .maybeSingle();

  if (!product) return { error: "Could not find that product." };

  const paths = (Array.isArray(product.image_paths) ? product.image_paths : []) as string[];
  // The path is only ever removed if it was already on this member's own
  // product, so a path posted from a browser cannot reach another member's
  // file in storage.
  if (!paths.includes(path)) return { error: "That picture is not on this product." };

  await admin
    .from("shop_products")
    .update({ image_paths: paths.filter((p) => p !== path), updated_at: new Date().toISOString() })
    .eq("id", productId)
    .eq("growth_client_id", client.id);

  await admin.storage.from("shop-products").remove([path]);

  await revalidateOwnPage(client.id);
  return { success: true };
}

/**
 * Makes a picture the main one.
 *
 * The first image is the one on the storefront card and, more importantly,
 * the one a WhatsApp link preview shows. That makes "which picture is
 * first" a real decision rather than a cosmetic one, so it gets a button
 * rather than a drag handle nobody can use on a phone.
 */
export async function makeProductImagePrimary(productId: string, path: string): Promise<ActionResult> {
  const client = await requireGrowthClientId();
  if (client.error !== undefined || !client.id) return { error: client.error ?? "Not signed in" };

  const admin = createAdminClient();
  const { data: product } = await admin
    .from("shop_products")
    .select("id, image_paths")
    .eq("id", productId)
    .eq("growth_client_id", client.id)
    .maybeSingle();

  if (!product) return { error: "Could not find that product." };

  const paths = (Array.isArray(product.image_paths) ? product.image_paths : []) as string[];
  if (!paths.includes(path)) return { error: "That picture is not on this product." };

  await admin
    .from("shop_products")
    .update({
      image_paths: [path, ...paths.filter((p) => p !== path)],
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("growth_client_id", client.id);

  await revalidateOwnPage(client.id);
  return { success: true };
}

// ============================================================
// Options, which are variants with a name on them
// ============================================================

/**
 * An option a buyer picks between: a size, a colour, an edition.
 *
 * Every product already has exactly one variant, unnamed, which is where
 * its stock lives. The first named option replaces that one rather than
 * sitting alongside it, because a product offering "Small, Medium, Large"
 * plus an invisible fourth choice holding its own separate stock is a bug
 * that only shows up as numbers not adding up weeks later.
 */
export async function saveProductOption(
  productId: string,
  variantId: string | null,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const client = await requireGrowthClientId();
  if (client.error !== undefined || !client.id) return { error: { _form: [client.error ?? "Not signed in"] } };

  const parsed = shopVariantSchema.safeParse({
    label: formData.get("label"),
    price: formData.get("price") || undefined,
    stockQuantity: formData.get("stockQuantity") || 0,
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const admin = createAdminClient();
  const { data: product } = await admin
    .from("shop_products")
    .select("id, sku, shop_product_variants(id, descriptor)")
    .eq("id", productId)
    .eq("growth_client_id", client.id)
    .maybeSingle();

  if (!product) return { error: { _form: ["Could not find that product."] } };

  const row = {
    descriptor: { option: parsed.data.label },
    price_cents: parsed.data.price == null ? null : Math.round(parsed.data.price * 100),
    stock_quantity: parsed.data.stockQuantity,
    updated_at: new Date().toISOString(),
  };

  if (variantId) {
    const { error } = await admin
      .from("shop_product_variants")
      .update(row)
      .eq("id", variantId)
      .eq("growth_client_id", client.id);
    if (error) return { error: { _form: ["Could not save, please try again."] } };
  } else {
    const existing = (product.shop_product_variants ?? []) as { id: string; descriptor: Record<string, string> | null }[];
    const plain = existing.find((v) => Object.keys(v.descriptor ?? {}).length === 0);

    if (plain) {
      // The unnamed placeholder becomes the first real option, which keeps
      // the stock that was already on it rather than stranding it.
      const { error } = await admin.from("shop_product_variants").update(row).eq("id", plain.id);
      if (error) return { error: { _form: ["Could not save, please try again."] } };
    } else {
      const { error } = await admin.from("shop_product_variants").insert({
        ...row,
        growth_client_id: client.id,
        shop_product_id: productId,
        sku: `${product.sku}-${slugify(parsed.data.label).toUpperCase() || "OPT"}`,
      });
      if (error) {
        return {
          error: {
            _form: [
              error.message.includes("shop_product_variants_shop_product_id_sku_key")
                ? "You already have an option with that name."
                : "Could not save, please try again.",
            ],
          },
        };
      }
    }
  }

  await revalidateOwnPage(client.id);
  return { success: true };
}

/**
 * Removes an option, unless it is the last one.
 *
 * A product with no variants at all cannot be bought: checkout picks the
 * variant to sell from this list and there would be nothing in it. So the
 * last option is renamed back to unnamed rather than deleted, which returns
 * the product to a plain one with a single stock number.
 */
export async function deleteProductOption(productId: string, variantId: string): Promise<ActionResult> {
  const client = await requireGrowthClientId();
  if (client.error !== undefined || !client.id) return { error: client.error ?? "Not signed in" };

  const admin = createAdminClient();
  const { data: variants } = await admin
    .from("shop_product_variants")
    .select("id")
    .eq("shop_product_id", productId)
    .eq("growth_client_id", client.id);

  if (!variants || !variants.some((v) => v.id === variantId)) {
    return { error: "Could not find that option." };
  }

  if (variants.length === 1) {
    await admin
      .from("shop_product_variants")
      .update({ descriptor: {}, price_cents: null, updated_at: new Date().toISOString() })
      .eq("id", variantId);
  } else {
    await admin.from("shop_product_variants").delete().eq("id", variantId).eq("growth_client_id", client.id);
  }

  await revalidateOwnPage(client.id);
  return { success: true };
}

export async function deleteProduct(productId: string): Promise<ActionResult> {
  const client = await requireGrowthClientId();
  if (client.error !== undefined) return { error: client.error };

  const admin = createAdminClient();
  await admin.from("shop_products").delete().eq("id", productId).eq("growth_client_id", client.id);
  await revalidateOwnPage(client.id);
  return { success: true };
}

export async function toggleProductActive(productId: string, active: boolean): Promise<ActionResult> {
  const client = await requireGrowthClientId();
  if (client.error !== undefined) return { error: client.error };

  const admin = createAdminClient();
  await admin
    .from("shop_products")
    .update({ status: active ? "active" : "draft", updated_at: new Date().toISOString() })
    .eq("id", productId)
    .eq("growth_client_id", client.id);
  await revalidateOwnPage(client.id);
  return { success: true };
}

export type CsvRowError = { row: number; error: string };

// Sec 4.2: "Valid rows commit in small batches, invalid or duplicate rows
// are skipped without stalling the upload and shown back as clear per-row
// errors." Parsing itself happens client-side (papaparse, in the dashboard
// component) — this only ever receives already-split rows, so it stays
// symmetrical with saveProduct's own per-field validation rather than a
// second, CSV-specific validation path.
export async function bulkUploadProducts(
  rows: Record<string, string>[]
): Promise<{ successCount: number; errors: CsvRowError[] }> {
  const client = await requireGrowthClientId();
  if (client.error !== undefined) return { successCount: 0, errors: [{ row: 0, error: client.error }] };

  const admin = createAdminClient();
  const errors: CsvRowError[] = [];
  let successCount = 0;
  const BATCH_SIZE = 25;

  for (let batchStart = 0; batchStart < rows.length; batchStart += BATCH_SIZE) {
    const batch = rows.slice(batchStart, batchStart + BATCH_SIZE);
    const validRows: { rowNumber: number; data: ReturnType<typeof shopCsvRowSchema.parse> }[] = [];

    batch.forEach((raw, i) => {
      const rowNumber = batchStart + i + 2; // +2: 1-indexed, plus the header row
      const parsed = shopCsvRowSchema.safeParse(raw);
      if (!parsed.success) {
        const firstError = parsed.error.issues[0];
        errors.push({ row: rowNumber, error: `${firstError.path.join(".")}: ${firstError.message}` });
        return;
      }
      validRows.push({ rowNumber, data: parsed.data });
    });

    for (const { rowNumber, data } of validRows) {
      // Every product needs its own URL, including the fifty that arrive at
      // once in a spreadsheet. Generated one at a time rather than in the
      // batch, because uniqueness has to account for the rows written a
      // moment ago in this same upload as well as everything already there.
      const slug = await uniqueProductSlug(client.id, data.title);

      const { data: product, error } = await admin
        .from("shop_products")
        .insert({
          growth_client_id: client.id,
          title: data.title,
          slug,
          sku: data.sku,
          description: data.description || null,
          base_price_cents: Math.round(data.price * 100),
          weight_kg: data.weight_kg,
          length_cm: data.length_cm,
          width_cm: data.width_cm,
          height_cm: data.height_cm,
          // A spreadsheet with a stock column is a member who counts stock,
          // which is the one case where the default is wrong.
          track_stock: true,
          status: "active",
        })
        .select("id")
        .single();

      if (error || !product) {
        errors.push({
          row: rowNumber,
          error: error?.message.includes("shop_products_growth_client_id_sku_key")
            ? `Duplicate SKU "${data.sku}", skipped`
            : "Could not save this row",
        });
        continue;
      }

      await admin.from("shop_product_variants").insert({
        growth_client_id: client.id,
        shop_product_id: product.id,
        sku: data.sku,
        stock_quantity: data.stock_quantity,
      });
      successCount++;
    }
  }

  await revalidateOwnPage(client.id);
  return { successCount, errors };
}

export async function saveCoupon(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const client = await requireGrowthClientId();
  if (client.error !== undefined) return { error: { _form: [client.error] } };

  const parsed = shopCouponSchema.safeParse({
    code: formData.get("code"),
    discountType: formData.get("discountType"),
    discountValue: formData.get("discountValue"),
    maxUses: formData.get("maxUses") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const admin = createAdminClient();
  const { error } = await admin.from("shop_coupons").insert({
    growth_client_id: client.id,
    code: parsed.data.code,
    discount_type: parsed.data.discountType,
    discount_value: parsed.data.discountValue,
    max_uses: parsed.data.maxUses ?? null,
  });
  if (error) {
    return {
      error: { _form: [error.message.includes("shop_coupons_growth_client_id_code_key") ? "You already have a coupon with this code." : "Could not save, please try again."] },
    };
  }

  await revalidateOwnPage(client.id);
  return { success: true };
}

export async function deleteCoupon(couponId: string): Promise<ActionResult> {
  const client = await requireGrowthClientId();
  if (client.error !== undefined) return { error: client.error };

  const admin = createAdminClient();
  await admin.from("shop_coupons").delete().eq("id", couponId).eq("growth_client_id", client.id);
  await revalidateOwnPage(client.id);
  return { success: true };
}

// markOrderFulfilled used to live here. It set fulfilment_status to
// "shipped" and told nobody, while markOrderShipped in orders-actions.ts
// does the same thing and emails the buyer. Two buttons that both say
// "shipped" and only one of which tells the customer is a trap: whichever
// one you press second appears to do nothing, and the buyer either hears
// twice or never. Shipping now goes through orders-actions.ts alone.
