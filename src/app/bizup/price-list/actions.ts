"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { catalogueItemSchema } from "@/lib/bizup/schemas";

// BizUp/docs/bizup-phase1-spec.md Sec 15.3, the price list (the spec's
// "catalogue"). Sec 11: a shortcut, never a requirement.

export type PriceListFormState = {
  error?: Record<string, string[]> & { _form?: string[] };
} | null;

async function currentAccountId(): Promise<string | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("bizup_accounts")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  return data?.id ?? null;
}

function fieldsFrom(formData: FormData) {
  return {
    name: formData.get("name"),
    description: formData.get("description"),
    type: formData.get("type") ?? "labour",
    unit: formData.get("unit") ?? "each",
    unitPriceExclCents: formData.get("unitPriceExclCents"),
    defaultMarkupPct: formData.get("defaultMarkupPct"),
  };
}

function toRow(values: ReturnType<typeof catalogueItemSchema.parse>) {
  return {
    name: values.name,
    description: values.description?.trim() || null,
    type: values.type,
    unit: values.unit,
    unit_price_excl_cents: values.unitPriceExclCents,
    default_markup_pct: values.defaultMarkupPct,
  };
}

export async function createCatalogueItem(
  _prevState: PriceListFormState,
  formData: FormData,
): Promise<PriceListFormState> {
  const accountId = await currentAccountId();
  if (!accountId) return { error: { _form: ["Please log in again."] } };

  const parsed = catalogueItemSchema.safeParse(fieldsFrom(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const admin = createAdminClient();
  const { error } = await admin
    .from("bizup_catalogue_items")
    .insert({ account_id: accountId, ...toRow(parsed.data) });

  if (error) {
    console.error("Failed to create KatisoBiz catalogue item", error);
    return { error: { _form: ["We couldn't save that. Please try again."] } };
  }

  revalidatePath("/bizup/price-list");
  redirect("/bizup/price-list");
}

export async function updateCatalogueItem(
  _prevState: PriceListFormState,
  formData: FormData,
): Promise<PriceListFormState> {
  const accountId = await currentAccountId();
  if (!accountId) return { error: { _form: ["Please log in again."] } };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: { _form: ["That item could not be found."] } };

  const parsed = catalogueItemSchema.safeParse(fieldsFrom(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const admin = createAdminClient();
  const { error } = await admin
    .from("bizup_catalogue_items")
    .update({ ...toRow(parsed.data), updated_at: new Date().toISOString() })
    .eq("id", id)
    // Scoped to the caller's own account as well as the id. This runs with
    // the service role and bypasses RLS, so the id alone would let a
    // hand-edited form field reach another member's price list.
    .eq("account_id", accountId);

  if (error) {
    console.error("Failed to update KatisoBiz catalogue item", error);
    return { error: { _form: ["We couldn't save that. Please try again."] } };
  }

  revalidatePath("/bizup/price-list");
  redirect("/bizup/price-list");
}

/**
 * Archive rather than delete.
 *
 * A price that is no longer offered still appears on every quote that used
 * it, and a member who stops offering a service should not lose the record
 * of having offered it. Archived items drop out of the quote builder and
 * the main list but stay readable.
 */
export async function setCatalogueItemActive(formData: FormData): Promise<void> {
  const accountId = await currentAccountId();
  if (!accountId) return;

  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("bizup_catalogue_items")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("account_id", accountId);

  if (error) console.error("Failed to archive KatisoBiz catalogue item", error);

  revalidatePath("/bizup/price-list");
  redirect("/bizup/price-list");
}
