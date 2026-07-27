"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { businessProfileSchema } from "@/lib/bizup/schemas";
import { bizUpEntitlementForTier } from "@/lib/bizup/entitlements";
import { setActiveProductPreference , bizupLoginPath } from "@/lib/bizup/product";
import type { Tier } from "@/lib/paystack/plans";
import { isTemplateId } from "@/lib/bizup/pdf/document";

export type BizUpFormState = {
  error?: Record<string, string[]> & { _form?: string[] };
} | null;

function fieldsFrom(formData: FormData) {
  return {
    businessName: formData.get("businessName"),
    tradingName: formData.get("tradingName"),
    registrationNumber: formData.get("registrationNumber"),
    vatNumber: formData.get("vatNumber"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2"),
    city: formData.get("city"),
    province: formData.get("province"),
    postalCode: formData.get("postalCode"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    whatsapp: formData.get("whatsapp"),
    financialYearEndMonth: formData.get("financialYearEndMonth") ?? 2,
  };
}

/** Empty string means "not provided", which for a nullable column is null, not "". */
function orNull(value: string | undefined): string | null {
  return value && value.trim() !== "" ? value.trim() : null;
}

/**
 * BizUp/docs/bizup-phase1-spec.md Sec 15.1, account setup.
 *
 * Creates the member's KatisoBiz account and, if the same login already holds
 * a Growth business, links the two and applies the bundled entitlement
 * from Sec 2 rather than leaving a Growth Engine member sitting on the
 * free cap.
 */
export async function createBizUpAccount(
  _prevState: BizUpFormState,
  formData: FormData,
): Promise<BizUpFormState> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: { _form: ["Please log in again."] } };

  const parsed = businessProfileSchema.safeParse(fieldsFrom(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const values = parsed.data;

  const admin = createAdminClient();

  // owner_user_id is unique, so a double submit would fail on the
  // constraint rather than silently create a second account. Checked first
  // anyway so the member gets their dashboard instead of an error.
  const { data: existing } = await admin
    .from("bizup_accounts")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (existing) redirect("/bizup");

  // Sec 2's bundling table. A standalone signup has no Growth account and
  // correctly starts on `free` / `self_paid`.
  const { data: membership } = await admin
    .from("growth_members")
    .select("growth_client_id, growth_clients(plan)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const growthTier = (membership?.growth_clients as unknown as { plan: Tier } | null)?.plan ?? null;
  const entitlement = growthTier
    ? bizUpEntitlementForTier(growthTier)
    : { plan: "free" as const, planSource: "self_paid" as const };

  const { data: created, error } = await admin
    .from("bizup_accounts")
    .insert({
      owner_user_id: user.id,
      growth_client_id: membership?.growth_client_id ?? null,
      business_name: values.businessName,
      trading_name: orNull(values.tradingName),
      registration_number: orNull(values.registrationNumber),
      vat_number: orNull(values.vatNumber),
      // Sec 3.1: a document's VAT treatment follows the status that
      // applied when it was issued, so the date the member became a vendor
      // is recorded at the moment the number is first entered.
      vat_registered_from: values.vatNumber ? new Date().toISOString().slice(0, 10) : null,
      address_line1: orNull(values.addressLine1),
      address_line2: orNull(values.addressLine2),
      city: orNull(values.city),
      province: orNull(values.province),
      postal_code: orNull(values.postalCode),
      email: values.email,
      phone: orNull(values.phone),
      whatsapp: orNull(values.whatsapp),
      financial_year_end_month: values.financialYearEndMonth,
      plan: entitlement.plan,
      plan_source: entitlement.planSource,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("Failed to create KatisoBiz account", error);
    return { error: { _form: ["We couldn't save that. Please try again."] } };
  }

  await admin.from("bizup_audit_log").insert({
    account_id: created.id,
    actor_user_id: user.id,
    action: "account_created",
    reason: growthTier ? `Linked to Growth tier ${growthTier}` : "Standalone KatisoBiz signup",
  });

  await setActiveProductPreference("bizup");
  redirect("/bizup");
}

/**
 * Sec 15.1, editing the same profile afterwards.
 *
 * The one thing this does beyond a plain update is watch VAT status.
 * Sec 3.1 makes VAT registration the switch that decides whether a
 * document is titled "Invoice" or "Tax Invoice", so a change to it is
 * audited, and vat_registered_from is stamped the first time a number is
 * added and never rewritten afterwards.
 */
export async function updateBizUpAccount(
  _prevState: BizUpFormState,
  formData: FormData,
): Promise<BizUpFormState> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: { _form: ["Please log in again."] } };

  const parsed = businessProfileSchema.safeParse(fieldsFrom(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const values = parsed.data;

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("bizup_accounts")
    .select("id, vat_number, vat_registered_from")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!account) redirect("/bizup/start");

  const hadVat = !!account.vat_number;
  const hasVat = !!values.vatNumber;

  const { error } = await admin
    .from("bizup_accounts")
    .update({
      business_name: values.businessName,
      trading_name: orNull(values.tradingName),
      registration_number: orNull(values.registrationNumber),
      vat_number: orNull(values.vatNumber),
      // Stamped on the transition into being a vendor, and preserved
      // otherwise. Never cleared by an edit: a member who removes their
      // VAT number stops charging VAT going forward, but the date they
      // were registered from is part of the history of documents already
      // issued.
      vat_registered_from:
        !hadVat && hasVat
          ? new Date().toISOString().slice(0, 10)
          : account.vat_registered_from,
      address_line1: orNull(values.addressLine1),
      address_line2: orNull(values.addressLine2),
      city: orNull(values.city),
      province: orNull(values.province),
      postal_code: orNull(values.postalCode),
      email: values.email,
      phone: orNull(values.phone),
      whatsapp: orNull(values.whatsapp),
      financial_year_end_month: values.financialYearEndMonth,
      updated_at: new Date().toISOString(),
    })
    .eq("id", account.id);

  if (error) {
    console.error("Failed to update KatisoBiz account", error);
    return { error: { _form: ["We couldn't save that. Please try again."] } };
  }

  if (hadVat !== hasVat) {
    await admin.from("bizup_audit_log").insert({
      account_id: account.id,
      actor_user_id: user.id,
      action: hasVat ? "vat_registration_added" : "vat_registration_removed",
      from_status: hadVat ? "vat_vendor" : "not_vat_vendor",
      to_status: hasVat ? "vat_vendor" : "not_vat_vendor",
    });
  }

  revalidatePath("/bizup");
  revalidatePath("/bizup/settings/business");
  return null;
}

/**
 * Sec 10: template choice is per account, changeable at any time, and
 * applies to future documents only. Historical documents keep the template
 * that was active when they were issued, because template_id is stored on
 * each document and read from there at render time.
 */
export async function updateTemplate(
  _prev: BizUpFormState,
  formData: FormData,
): Promise<BizUpFormState> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: { _form: ["Please log in again."] } };

  const templateId = String(formData.get("templateId") ?? "");
  if (!isTemplateId(templateId)) return { error: { _form: ["Choose one of the templates."] } };

  const admin = createAdminClient();
  const { error } = await admin
    .from("bizup_accounts")
    .update({ template_id: templateId, updated_at: new Date().toISOString() })
    .eq("owner_user_id", user.id);

  // Dewald: "I try to change the template and click on save nothing
  // happens." It was saving correctly the whole time and saying nothing,
  // and the radio keeps whatever the member clicked either way, so a
  // working save looked exactly like a broken one. Silence is the bug.
  if (error) {
    console.error("Failed to update KatisoBiz template", error);
    return { error: { _form: ["We could not save that. Please try again."] } };
  }

  revalidatePath("/bizup/settings/business");
  revalidatePath("/bizup/settings");
  return null;
}

/**
 * Log out of KatisoBiz.
 *
 * There was no way out of KatisoBiz at all until Dewald tried to sign up a
 * second account and found himself stuck in the first one. Sends the member
 * to KatisoBiz's own login rather than Growth's, since that is the product they
 * were in.
 */
export async function logOutOfBizUp(): Promise<void> {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect(await bizupLoginPath());
}
