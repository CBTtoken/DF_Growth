"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { ensureLinkedBizUpAccount } from "@/lib/growth-client/bizup-link";
import { bizUpEntitlementForTier } from "@/lib/bizup/entitlements";
import type { Tier } from "@/lib/paystack/plans";

// Handoff: scripts/handoff-activation-nudges-and-emails.md, Job 1.
//
// The one button that ever creates a KatisoBiz account for a Growth member.
// Nothing else does this silently anymore — see ensureLinkedBizUpAccount's
// own comment for why. Tries a link first (a matching account may exist
// now even if it didn't at signup), and only creates fresh if that finds
// nothing, so this can never produce a second account for someone who
// already has one.
export async function activateBizUp(): Promise<void> {
  const client = await requireGrowthClientId();
  if (client.error) redirect("/login");

  const admin = createAdminClient();
  const { data: growthClient } = await admin
    .from("growth_clients")
    .select("business_name, contact_email, plan, call_phone, whatsapp_phone")
    .eq("id", client.id!)
    .single();
  if (!growthClient) redirect("/dashboard");

  const {
    data: { user },
  } = await (await createServerClient()).auth.getUser();
  if (!user) redirect("/login");

  const linked = await ensureLinkedBizUpAccount({
    growthClientId: client.id!,
    ownerUserId: user.id,
    tier: growthClient.plan as Tier,
    phoneCandidates: [growthClient.call_phone, growthClient.whatsapp_phone],
  });

  if (!linked) {
    const { plan, planSource } = bizUpEntitlementForTier(growthClient.plan as Tier);
    await admin.from("bizup_accounts").insert({
      owner_user_id: user.id,
      growth_client_id: client.id!,
      business_name: growthClient.business_name,
      // Growth signup always collects one of these two; a business with
      // genuinely neither is not a state this app's own signup flow can
      // produce.
      email: growthClient.contact_email ?? user.email!,
      plan,
      plan_source: planSource,
    });
  }

  // Stamped here regardless of which path above produced the linked row:
  // the meaningful event is "this member pressed activate and it worked,"
  // not specifically whether an account was created or an existing one
  // matched. A member never sees this button once a link already exists
  // (BizUpFromGrowth's own hasBizUpAccount gate), so this row was
  // genuinely unlinked one line ago.
  await admin
    .from("bizup_accounts")
    .update({ activated_at: new Date().toISOString() })
    .eq("growth_client_id", client.id!);

  redirect("/bizup");
}
