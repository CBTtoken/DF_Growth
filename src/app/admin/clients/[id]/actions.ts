"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

// Real gap found live: admin had no way to take a live page down (a test
// signup was showing up on /marketplace with no way to hide or remove it)
// short of a direct database query. Reuses the "cancelled" status value
// self-serve cancel (dashboard/actions.ts) already writes — [clientSlug]/
// page.tsx and every public listing already gate on status === "active",
// so this hides the page the same way a real cancellation does, without
// inventing a second status value nothing else checks. Reversible: calling
// it again on a cancelled account reactivates it.
export async function toggleClientVisibility(clientId: string) {
  const adminUser = await requireAdminEmail();
  if ("error" in adminUser) return { error: "Not authorized." };

  const admin = createAdminClient();
  const { data: client } = await admin.from("growth_clients").select("status").eq("id", clientId).single();
  if (!client) return { error: "Client not found." };

  const nextStatus = client.status === "active" ? "cancelled" : "active";
  const { error } = await admin.from("growth_clients").update({ status: nextStatus }).eq("id", clientId);
  if (error) return { error: "Could not update, please try again." };

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin");
  revalidatePath("/marketplace");
  return { success: true };
}

// Real delete, not a soft-hide — for genuine test/junk accounts (the
// original real case: two throwaway "ABC Group" signups cluttering
// /marketplace). Every child table cascades on growth_client_id except
// whatsapp_conversations (see supabase/migrations/20260712180000_add_
// whatsapp_onboarding.sql — no ON DELETE CASCADE there), so that one needs
// an explicit delete first or the growth_clients delete itself would fail
// on the foreign key. Does not touch Storage objects (logo/photos/
// generated assets) or the linked auth user — a known gap, not silently
// pretended away; a user can own more than one growth_client (see the
// account switcher), so deleting their login here would be wrong.
export async function deleteClient(clientId: string) {
  const adminUser = await requireAdminEmail();
  if ("error" in adminUser) return { error: "Not authorized." };

  const admin = createAdminClient();
  await admin.from("whatsapp_conversations").delete().eq("growth_client_id", clientId);
  const { error } = await admin.from("growth_clients").delete().eq("id", clientId);
  if (error) return { error: "Could not delete, please try again." };

  revalidatePath("/admin");
  revalidatePath("/marketplace");
  redirect("/admin");
}
