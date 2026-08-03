"use server";

import { redirect } from "next/navigation";
import { createSvcClient } from "@/lib/svc/db";
import { svcPath } from "@/lib/svc/host";
import { getCurrentMember } from "@/lib/svc/member";
import { couponProvider } from "@/lib/svc/coupons";
import { markOpened, markClaimed, markSelfRedeemed } from "@/lib/svc/ledger";

/**
 * Every dashboard action re-derives the member from the session and
 * touches only that member's rows; the issue id alone is never trusted.
 */

async function requireMember() {
  const member = await getCurrentMember();
  if (!member) redirect(await svcPath("/login"));
  return member!;
}

/** Member viewed a benefit's details. issued -> opened, once. */
export async function openBenefit(formData: FormData) {
  const member = await requireMember();
  const issueId = String(formData.get("issue") ?? "");
  const backTo = String(formData.get("back") ?? "/account");
  if (issueId) await markOpened(issueId, member.id);
  redirect(await svcPath(backTo === "/account/coupons" ? "/account/coupons" : "/account"));
}

/** Member takes/selects a benefit. -> claimed. */
export async function claimBenefit(formData: FormData) {
  const member = await requireMember();
  const issueId = String(formData.get("issue") ?? "");
  const backTo = String(formData.get("back") ?? "/account");
  if (issueId) {
    if (backTo === "/account/coupons") await couponProvider().claim(member.id, issueId);
    else await markClaimed(issueId, member.id);
  }
  redirect(await svcPath(backTo === "/account/coupons" ? "/account/coupons" : "/account"));
}

/**
 * "I used this", with the optional amount question (handoff Sprint 2).
 * Amount arrives in Rand from the form and is stored in cents.
 */
export async function confirmBenefitUsed(formData: FormData) {
  const member = await requireMember();
  const issueId = String(formData.get("issue") ?? "");
  const backTo = String(formData.get("back") ?? "/account");
  const amountRaw = String(formData.get("amount") ?? "").trim().replace(",", ".");

  let amountCents: number | null = null;
  if (amountRaw) {
    const parsed = Number(amountRaw);
    if (Number.isFinite(parsed) && parsed >= 0) amountCents = Math.round(parsed * 100);
  }

  if (issueId) {
    if (backTo === "/account/coupons") {
      await couponProvider().confirmUsed(member.id, issueId, amountCents);
    } else {
      await markSelfRedeemed(issueId, member.id, amountCents);
    }
  }
  redirect(await svcPath(backTo === "/account/coupons" ? "/account/coupons" : "/account"));
}

/**
 * Demand capture (handoff 7.4): "which shop or product should we get
 * coupons for next?" One insert, no fanfare; the aggregated view lives in
 * admin.
 */
export async function submitDemandSignal(formData: FormData) {
  const member = await requireMember();
  const category = String(formData.get("category") ?? "").trim().slice(0, 50);
  const message = String(formData.get("message") ?? "").trim().slice(0, 500);

  if (!category || !message) {
    redirect(`${await svcPath("/account")}?ask=missing`);
  }

  const db = createSvcClient();
  const { error } = await db.from("demand_signal").insert({
    member_id: member.id,
    category,
    message,
  });
  if (error) {
    console.error("SVC demand signal insert failed", error);
    redirect(`${await svcPath("/account")}?ask=failed`);
  }
  redirect(`${await svcPath("/account")}?ask=thanks`);
}

/**
 * Cancellation from the dashboard with the reason captured (handoff
 * Sprint 2). Benefits stay live to the end of the paid period: the status
 * flips to cancelled but current_period_end stands, and both the issue
 * run and the Moxie bridge honour paid time.
 */
export async function cancelMembership(formData: FormData) {
  const member = await requireMember();
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);

  if (!reason) {
    redirect(`${await svcPath("/account/cancel")}?error=reason`);
  }

  const db = createSvcClient();
  const { error } = await db
    .from("subscription")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("member_id", member.id)
    .eq("status", "active");

  if (error) {
    console.error("SVC cancellation failed", error);
    redirect(`${await svcPath("/account/cancel")}?error=failed`);
  }

  redirect(`${await svcPath("/account")}?cancelled=1`);
}
