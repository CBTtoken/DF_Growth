"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { sendWelcomeEmail } from "@/lib/email/welcome";
import type { Tier } from "@/lib/paystack/plans";

type MarketplaceUrlState = { error?: string; success?: boolean } | null;
type PlanControlState = { error?: string; success?: boolean } | null;
const VALID_TIERS: Tier[] = ["foundation", "growth_engine", "enterprise"];

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

// Direct admin override of the plan value — no Paystack involvement, no
// billing change. Real use: fixing a comped or test account's plan, or
// upgrading a client whose actual subscription is being handled outside
// this flow. Deliberately does NOT touch a real paying client's Paystack
// subscription — if this is used on a genuinely paying account, what they
// see here and what Paystack actually charges them can drift apart, so
// this is meant for admin-comped/test accounts, not as a payment-bypass
// upgrade path for real subscribers.
export async function adminChangePlan(_prevState: PlanControlState, formData: FormData): Promise<PlanControlState> {
  const adminUser = await requireAdminEmail();
  if ("error" in adminUser) return { error: "Not authorized." };

  const clientId = formData.get("clientId");
  const plan = formData.get("plan");
  if (typeof clientId !== "string" || !clientId) return { error: "Missing client." };
  if (typeof plan !== "string" || !VALID_TIERS.includes(plan as Tier)) return { error: "Invalid plan." };

  const admin = createAdminClient();
  const { error } = await admin.from("growth_clients").update({ plan }).eq("id", clientId);
  if (error) return { error: "Could not save, please try again." };

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

// The "let us build their page, test it, then start paying" flow: grants
// free access on any plan for a chosen window (blank = indefinite, admin
// ends it manually), bypassing Paystack entirely. Reuses the exact
// "finish onboarding" mechanics onboard/actions.ts's saveStep6 uses for a
// real trial activation — publish the landing page, send the "your page
// is live" email — but only the first time (a still-pending_intake
// client), so re-granting or extending an already-active comp doesn't
// resend it. trial_ends_at is explicitly cleared, matching is_agent_comped's
// own precedent, so the Foundation trial-reminder cron (which only ever
// looks at rows where trial_ends_at is set) leaves this account alone —
// admin_comp_until is a separate clock, checked by its own cron pass.
export async function grantAdminComp(_prevState: PlanControlState, formData: FormData): Promise<PlanControlState> {
  const adminUser = await requireAdminEmail();
  if ("error" in adminUser) return { error: "Not authorized." };

  const clientId = formData.get("clientId");
  const plan = formData.get("plan");
  const until = formData.get("until");
  const note = formData.get("note");
  if (typeof clientId !== "string" || !clientId) return { error: "Missing client." };
  if (typeof plan !== "string" || !VALID_TIERS.includes(plan as Tier)) return { error: "Invalid plan." };
  if (typeof until !== "string") return { error: "Invalid date." };

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("growth_clients")
    .select("status, slug, business_name, contact_email")
    .eq("id", clientId)
    .single();
  if (!client) return { error: "Client not found." };

  const wasNotYetLive = client.status !== "active";
  const untilIso = until ? new Date(`${until}T23:59:59`).toISOString() : null;
  const noteText = typeof note === "string" && note.trim() ? note.trim() : null;

  const { error } = await admin
    .from("growth_clients")
    .update({
      plan,
      status: "active",
      is_admin_comped: true,
      admin_comp_until: untilIso,
      admin_comp_note: noteText,
      trial_ends_at: null,
    })
    .eq("id", clientId);
  if (error) return { error: "Could not save, please try again." };

  if (wasNotYetLive) {
    await admin.from("landing_pages").update({ published: true }).eq("growth_client_id", clientId);
    if (client.slug) {
      await sendWelcomeEmail({ businessName: client.business_name, contactEmail: client.contact_email, slug: client.slug });
    }
  }

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/marketplace");
  return { success: true };
}

// Ends an admin-granted comp early — pauses the account the same way a
// trial's own expiry does (src/app/api/cron/trial-reminders), prompting
// real payment. admin_comp_until/admin_comp_note are left as-is as a
// record of what was granted; only is_admin_comped and status change.
export async function endAdminComp(clientId: string) {
  const adminUser = await requireAdminEmail();
  if ("error" in adminUser) return { error: "Not authorized." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("growth_clients")
    .update({ is_admin_comped: false, status: "paused" })
    .eq("id", clientId);
  if (error) return { error: "Could not update, please try again." };

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
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
