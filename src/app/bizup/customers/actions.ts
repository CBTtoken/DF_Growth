"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { customerSchema } from "@/lib/bizup/schemas";

// BizUp/docs/bizup-phase1-spec.md Sec 15.2, customers.

export type CustomerFormState = {
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
    // An unchecked checkbox sends nothing at all, which is why this is a
    // presence test rather than reading a value.
    isBusiness: formData.get("isBusiness") !== null,
    registrationNumber: formData.get("registrationNumber"),
    vatNumber: formData.get("vatNumber"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    whatsapp: formData.get("whatsapp"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2"),
    city: formData.get("city"),
    province: formData.get("province"),
    postalCode: formData.get("postalCode"),
    notes: formData.get("notes"),
  };
}

function orNull(value: string | undefined): string | null {
  return value && value.trim() !== "" ? value.trim() : null;
}

function toRow(values: ReturnType<typeof customerSchema.parse>) {
  return {
    name: values.name,
    is_business: values.isBusiness,
    registration_number: orNull(values.registrationNumber),
    vat_number: orNull(values.vatNumber),
    email: orNull(values.email),
    phone: orNull(values.phone),
    whatsapp: orNull(values.whatsapp),
    address_line1: orNull(values.addressLine1),
    address_line2: orNull(values.addressLine2),
    city: orNull(values.city),
    province: orNull(values.province),
    postal_code: orNull(values.postalCode),
    notes: orNull(values.notes),
  };
}

export async function createCustomer(
  _prevState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const accountId = await currentAccountId();
  if (!accountId) return { error: { _form: ["Please log in again."] } };

  const parsed = customerSchema.safeParse(fieldsFrom(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const admin = createAdminClient();
  const { error } = await admin
    .from("bizup_customers")
    .insert({ account_id: accountId, ...toRow(parsed.data) });

  if (error) {
    console.error("Failed to create BizUp customer", error);
    return { error: { _form: ["We couldn't save that. Please try again."] } };
  }

  revalidatePath("/bizup/customers");
  redirect("/bizup/customers");
}

export async function updateCustomer(
  _prevState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const accountId = await currentAccountId();
  if (!accountId) return { error: { _form: ["Please log in again."] } };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: { _form: ["That customer could not be found."] } };

  const parsed = customerSchema.safeParse(fieldsFrom(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const admin = createAdminClient();
  const { error } = await admin
    .from("bizup_customers")
    .update({ ...toRow(parsed.data), updated_at: new Date().toISOString() })
    .eq("id", id)
    // Scoped to the caller's own account as well as the id. The id alone
    // would let a hand-edited form field update another member's customer,
    // since this runs with the service role and bypasses RLS.
    .eq("account_id", accountId);

  if (error) {
    console.error("Failed to update BizUp customer", error);
    return { error: { _form: ["We couldn't save that. Please try again."] } };
  }

  revalidatePath("/bizup/customers");
  redirect("/bizup/customers");
}

export async function deleteCustomer(formData: FormData): Promise<void> {
  const accountId = await currentAccountId();
  if (!accountId) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("bizup_customers")
    .delete()
    .eq("id", id)
    .eq("account_id", accountId);

  if (error) {
    // Once documents exist, bizup_documents.customer_id references this
    // table with ON DELETE RESTRICT, so Postgres refuses to remove a
    // customer who has been invoiced. That is deliberate (Sec 12's
    // statements are per customer, and Sec 8's 5-year retention covers the
    // financial record they are named in), so it is reported rather than
    // worked around.
    console.error("Failed to delete BizUp customer", error);
    redirect("/bizup/customers?error=cannot-delete");
  }

  revalidatePath("/bizup/customers");
  redirect("/bizup/customers");
}
