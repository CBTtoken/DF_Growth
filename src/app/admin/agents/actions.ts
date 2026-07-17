"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { generateUniqueReferralCode } from "@/lib/agents/referral-code";
import { sendAgentApprovedEmail, sendAgentRejectedEmail } from "@/lib/email/agents";

// Sec 3: approving generates the referral code and sends the invite email
// in one step — an approved agent with no code yet, or a code nobody was
// ever told about, would be a genuine dead end.
export async function approveAgent(agentId: string) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const admin = createAdminClient();
  const { data: agent } = await admin.from("agents").select("full_name, email, status").eq("id", agentId).single();
  if (!agent || agent.status !== "pending") return;

  const referralCode = await generateUniqueReferralCode();

  const { error } = await admin
    .from("agents")
    .update({ status: "approved", referral_code: referralCode, approved_at: new Date().toISOString() })
    .eq("id", agentId);

  if (error) {
    console.error("Failed to approve agent", error);
    return;
  }

  await sendAgentApprovedEmail({ fullName: agent.full_name, email: agent.email, referralCode });

  revalidatePath("/admin/agents");
}

export async function rejectAgent(agentId: string) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const admin = createAdminClient();
  const { data: agent } = await admin.from("agents").select("full_name, email, status").eq("id", agentId).single();
  if (!agent || agent.status !== "pending") return;

  const { error } = await admin
    .from("agents")
    .update({ status: "rejected", rejected_at: new Date().toISOString() })
    .eq("id", agentId);

  if (error) {
    console.error("Failed to reject agent", error);
    return;
  }

  await sendAgentRejectedEmail({ fullName: agent.full_name, email: agent.email });

  revalidatePath("/admin/agents");
}

// Sec 7/8: manual, ledger-driven payout tracking — no Transfers API call
// here (Sprint 2, and even then only ever operator-triggered, never
// automatic per Sec 7). "approved_to_pay" lets an admin batch up what's
// about to be paid before actually sending the money outside this app,
// then mark it paid with a reference once it's really done.
export async function markCommissionApprovedToPay(ledgerId: string, agentId: string) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const admin = createAdminClient();
  await admin.from("commission_ledger").update({ status: "approved_to_pay" }).eq("id", ledgerId).eq("status", "pending");

  revalidatePath(`/admin/agents/${agentId}`);
}

export async function markCommissionPaid(ledgerId: string, agentId: string, reference: string) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const admin = createAdminClient();
  await admin
    .from("commission_ledger")
    .update({
      status: "paid",
      paystack_transfer_reference: reference || null,
      paid_at: new Date().toISOString(),
    })
    .eq("id", ledgerId)
    .neq("status", "paid");

  revalidatePath(`/admin/agents/${agentId}`);
}
