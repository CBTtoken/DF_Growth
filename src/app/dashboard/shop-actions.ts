"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import {
  shopProductSchema,
  shopCsvRowSchema,
  shopCouponSchema,
  shopCollectionAddressSchema,
} from "@/lib/schemas/shop";

type ActionState = { error?: Record<string, string[]> & { _form?: string[] }; success?: boolean } | null;
type ActionResult = { error?: string; success?: boolean };

async function revalidateOwnPage(clientId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("growth_clients").select("slug").eq("id", clientId).single();
  revalidatePath("/dashboard");
  if (data?.slug) revalidatePath(`/${data.slug}`);
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

// A product's single default variant carries its own stock — see
// BulkUpload/ShopSection.tsx's own comment on why Sprint 3 doesn't build a
// size/colour variant picker: one variant per product keeps checkout and
// stock logic uniform against shop_product_variants (the schema's real
// design) without needing that UI yet.
export async function saveProduct(
  productId: string | null,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const client = await requireGrowthClientId();
  if (client.error !== undefined) return { error: { _form: [client.error] } };

  const parsed = shopProductSchema.safeParse({
    title: formData.get("title"),
    sku: formData.get("sku"),
    description: formData.get("description") || undefined,
    basePrice: formData.get("basePrice"),
    weightKg: formData.get("weightKg"),
    lengthCm: formData.get("lengthCm"),
    widthCm: formData.get("widthCm"),
    heightCm: formData.get("heightCm"),
    stockQuantity: formData.get("stockQuantity") || 0,
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const admin = createAdminClient();
  const productRow = {
    growth_client_id: client.id,
    title: parsed.data.title,
    sku: parsed.data.sku,
    description: parsed.data.description || null,
    base_price_cents: Math.round(parsed.data.basePrice * 100),
    weight_kg: parsed.data.weightKg,
    length_cm: parsed.data.lengthCm,
    width_cm: parsed.data.widthCm,
    height_cm: parsed.data.heightCm,
    status: "active" as const,
    updated_at: new Date().toISOString(),
  };

  if (productId) {
    const { error } = await admin.from("shop_products").update(productRow).eq("id", productId).eq("growth_client_id", client.id);
    if (error) return { error: { _form: [error.message.includes("shop_products_growth_client_id_sku_key") ? "You already have a product with this SKU." : "Could not save — please try again."] } };
    await admin
      .from("shop_product_variants")
      .update({ stock_quantity: parsed.data.stockQuantity, updated_at: new Date().toISOString() })
      .eq("shop_product_id", productId);
  } else {
    const { data: product, error } = await admin.from("shop_products").insert(productRow).select("id").single();
    if (error || !product) {
      return { error: { _form: [error?.message.includes("shop_products_growth_client_id_sku_key") ? "You already have a product with this SKU." : "Could not save — please try again."] } };
    }
    await admin.from("shop_product_variants").insert({
      growth_client_id: client.id,
      shop_product_id: product.id,
      sku: parsed.data.sku,
      stock_quantity: parsed.data.stockQuantity,
    });
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
      const { data: product, error } = await admin
        .from("shop_products")
        .insert({
          growth_client_id: client.id,
          title: data.title,
          sku: data.sku,
          description: data.description || null,
          base_price_cents: Math.round(data.price * 100),
          weight_kg: data.weight_kg,
          length_cm: data.length_cm,
          width_cm: data.width_cm,
          height_cm: data.height_cm,
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
      error: { _form: [error.message.includes("shop_coupons_growth_client_id_code_key") ? "You already have a coupon with this code." : "Could not save — please try again."] },
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

export async function markOrderFulfilled(orderId: string): Promise<ActionResult> {
  const client = await requireGrowthClientId();
  if (client.error !== undefined) return { error: client.error };

  const admin = createAdminClient();
  await admin
    .from("shop_orders")
    .update({ fulfilment_status: "shipped", updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("growth_client_id", client.id);
  await revalidateOwnPage(client.id);
  return { success: true };
}
