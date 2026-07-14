"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";

type MarketplaceUrlState = { error?: string; success?: boolean } | null;

// Public Beta Polish Sprint Sec 11: the only writer of growth_clients.
// marketplace_url anywhere in this codebase — deliberately admin-only,
// never exposed to a client during onboarding or in their own dashboard.
// Empty input clears the field back to null (matches Section 11's "never
// auto-generate a link" rule — an unset listing must render as unset, not
// a stale/guessed URL).
export async function setMarketplaceUrl(
  _prevState: MarketplaceUrlState,
  formData: FormData
): Promise<MarketplaceUrlState> {
  const adminUser = await requireAdminEmail();
  if ("error" in adminUser) return { error: "Not authorized." };

  const clientId = formData.get("clientId");
  const marketplaceUrl = formData.get("marketplaceUrl");

  if (typeof clientId !== "string" || !clientId) {
    return { error: "Missing client." };
  }
  if (typeof marketplaceUrl !== "string") {
    return { error: "Invalid value." };
  }

  const trimmed = marketplaceUrl.trim();
  if (trimmed && !/^https?:\/\/.+/.test(trimmed)) {
    return { error: "Should be a full link, e.g. https://digitalflyer.co.za/listing/..." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("growth_clients")
    .update({ marketplace_url: trimmed || null })
    .eq("id", clientId);

  if (error) return { error: "Could not save, please try again." };

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/dashboard");
  return { success: true };
}
