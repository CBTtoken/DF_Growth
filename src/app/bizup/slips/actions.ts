"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { capabilitiesFor, type BizUpPlan } from "@/lib/bizup/entitlements";
import { captureSlip, SLIPS_BUCKET, slipsTrialActive } from "@/lib/bizup/slips";

// Slip management server actions (BizUp/docs/HANDOFF-slip-management.md).
//
// Every action re-checks ownership and plan itself rather than trusting
// the page that rendered the form: a form post is just a request, and the
// slips surface is an R49 feature.

export type SlipActionState = { error?: string } | null;

async function currentAccount(): Promise<{
  id: string;
  plan: BizUpPlan;
  slipsTrialUntil: string | null;
} | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("bizup_accounts")
    .select("id, plan, slips_trial_until")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    plan: data.plan as BizUpPlan,
    slipsTrialUntil: data.slips_trial_until,
  };
}

export async function uploadSlip(formData: FormData): Promise<SlipActionState> {
  const account = await currentAccount();
  if (!account) return { error: "Please log in again." };
  if (
    !capabilitiesFor(account.plan).expenseSlips &&
    !slipsTrialActive(account.slipsTrialUntil)
  ) {
    return { error: "Slips come with the R49 plan." };
  }

  const result = await captureSlip(account.id, formData.get("image"));
  if ("error" in result) return { error: result.error };

  revalidatePath("/bizup/slips");
  return null;
}

/**
 * Saves the member's corrections to one slip. This is the review step:
 * the member has looked at every field and pressed save, which is what
 * `reviewed` means. Nothing else ever sets it.
 */
export async function saveSlipDetails(formData: FormData): Promise<SlipActionState> {
  const account = await currentAccount();
  if (!account) return { error: "Please log in again." };

  const id = String(formData.get("slipId") ?? "");
  const slipDate = String(formData.get("slipDate") ?? "");
  const supplier = String(formData.get("supplier") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const amountRands = Number(String(formData.get("amount") ?? "").replace(",", "."));
  const vatRaw = String(formData.get("vat") ?? "").trim();
  const vatRands = vatRaw === "" ? null : Number(vatRaw.replace(",", "."));

  if (!/^\d{4}-\d{2}-\d{2}$/.test(slipDate)) return { error: "Give the slip a date." };
  if (!isFinite(amountRands) || amountRands < 0) return { error: "Check the amount." };
  if (vatRands !== null && (!isFinite(vatRands) || vatRands < 0)) {
    return { error: "Check the VAT amount." };
  }

  const admin = createAdminClient();
  const { data: slip } = await admin
    .from("bizup_expense_slips")
    .select("id, status")
    .eq("id", id)
    .eq("account_id", account.id)
    .maybeSingle();
  if (!slip) return { error: "That slip was not found." };
  if (slip.status === "exported" || slip.status === "purged") {
    return { error: "That slip has already gone to your accountant and cannot change." };
  }

  await admin
    .from("bizup_expense_slips")
    .update({
      slip_date: slipDate,
      supplier: supplier ? supplier.slice(0, 120) : null,
      description: description ? description.slice(0, 300) : null,
      amount_cents: Math.round(amountRands * 100),
      vat_amount_cents: vatRands === null ? null : Math.round(vatRands * 100),
      status: "reviewed",
    })
    .eq("id", id)
    .eq("account_id", account.id);

  revalidatePath("/bizup/slips");
  return null;
}

/**
 * The one tap per slip: business or personal. The member's decision,
 * never the OCR's, and changeable until the slip is exported.
 */
export async function setSlipAllocation(formData: FormData): Promise<SlipActionState> {
  const account = await currentAccount();
  if (!account) return { error: "Please log in again." };

  const id = String(formData.get("slipId") ?? "");
  const allocation = String(formData.get("allocation") ?? "");
  if (allocation !== "business" && allocation !== "personal") return { error: "Pick one." };

  const admin = createAdminClient();
  const { data: slip } = await admin
    .from("bizup_expense_slips")
    .select("id, status")
    .eq("id", id)
    .eq("account_id", account.id)
    .maybeSingle();
  if (!slip) return { error: "That slip was not found." };
  if (slip.status === "exported" || slip.status === "purged") {
    return { error: "That slip has already gone to your accountant and cannot change." };
  }

  // Allocating is acting on the slip, but it is not confirming the
  // numbers, so it deliberately does not mark the slip reviewed.
  await admin
    .from("bizup_expense_slips")
    .update({ allocation })
    .eq("id", id)
    .eq("account_id", account.id);

  revalidatePath("/bizup/slips");
  return null;
}

/**
 * Removes a slip the member captured by mistake, photo and row both.
 * Only before export: once a slip has travelled to the accountant its
 * row is part of the record and stays.
 */
export async function deleteSlip(formData: FormData): Promise<SlipActionState> {
  const account = await currentAccount();
  if (!account) return { error: "Please log in again." };

  const id = String(formData.get("slipId") ?? "");
  const admin = createAdminClient();
  const { data: slip } = await admin
    .from("bizup_expense_slips")
    .select("id, status, storage_path")
    .eq("id", id)
    .eq("account_id", account.id)
    .maybeSingle();
  if (!slip) return { error: "That slip was not found." };
  if (slip.status === "exported" || slip.status === "purged") {
    return { error: "That slip has already gone to your accountant and stays on record." };
  }

  if (slip.storage_path) {
    await admin.storage.from(SLIPS_BUCKET).remove([slip.storage_path]);
  }
  await admin.from("bizup_expense_slips").delete().eq("id", id).eq("account_id", account.id);

  revalidatePath("/bizup/slips");
  return null;
}
