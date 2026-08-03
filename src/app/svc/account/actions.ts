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
 * The coupon unlock: the identity fields MiFuel's member API makes
 * mandatory (title, date of birth, ID number), collected once at the
 * moment they matter rather than at signup where every field costs
 * joins. Saving provisions the member on MiFuel immediately.
 */
export async function saveCouponIdentity(formData: FormData) {
  const member = await requireMember();
  const title = String(formData.get("title") ?? "");
  const dob = String(formData.get("dob") ?? "").trim();
  const idType = formData.get("idType") === "passport" ? "passport" : "sa_id";
  const idNumber = String(formData.get("idNumber") ?? "").replace(/\s+/g, "");

  const back = await svcPath("/account/coupons");

  if (!["Mr", "Mrs", "Miss"].includes(title)) redirect(`${back}?unlock=title`);
  const dobDate = new Date(dob);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(dobDate.getTime()) || dobDate > new Date()) {
    redirect(`${back}?unlock=dob`);
  }
  if (idType === "sa_id" && !/^\d{13}$/.test(idNumber)) redirect(`${back}?unlock=id`);
  if (idType === "passport" && !/^[A-Za-z0-9]{5,20}$/.test(idNumber)) redirect(`${back}?unlock=id`);

  const db = createSvcClient();
  const { error } = await db
    .from("member")
    .update({
      title,
      date_of_birth: dob,
      id_type: idType,
      id_number: idNumber,
      updated_at: new Date().toISOString(),
    })
    .eq("id", member.id);
  if (error) {
    console.error("SVC coupon identity save failed", error);
    redirect(`${back}?unlock=failed`);
  }

  const { provisionMifuelMember } = await import("@/lib/svc/mifuel");
  const result = await provisionMifuelMember(member.id);
  redirect(`${back}?unlock=${result.ok ? "linked" : `error_${result.error}`}`);
}

/**
 * Buying draw entries (handoff 10.1). Every gate lives server-side in
 * drawPurchaseEligibility; this action re-derives all of it and refuses
 * politely, whatever the interface showed. Mock provider mints instantly;
 * Paystack goes through the hosted page and the tickets callback.
 */
export async function buyDrawTickets(formData: FormData) {
  const member = await requireMember();
  const countRaw = Number(formData.get("count") ?? 0);
  const count = Number.isInteger(countRaw) ? Math.min(Math.max(countRaw, 1), 100) : 0;

  const back = await svcPath("/account");
  if (count < 1) redirect(`${back}?tickets=count`);

  const { drawPurchaseEligibility, recordTicketPurchase } = await import("@/lib/svc/draw-purchase");
  const eligibility = await drawPurchaseEligibility(member.id);
  if (!eligibility.eligible) {
    redirect(`${back}?tickets=${eligibility.reason}`);
  }

  const draw = eligibility.draw;
  const amountCents = (draw.ticket_price_cents ?? 0) * count;
  if (amountCents <= 0) redirect(`${back}?tickets=flag_off`);

  const { svcPaymentProvider, initializeSvcTicketCheckout } = await import("@/lib/svc/payments");

  if (svcPaymentProvider() === "mock") {
    await recordTicketPurchase({
      drawId: draw.id,
      memberId: member.id,
      count,
      amountCents,
      reference: `mock_tickets_${Date.now()}`,
    });
    redirect(`${back}?tickets=done`);
  }

  const { headers: getHeaders } = await import("next/headers");
  const { isSvcHost, SVC_ORIGIN } = await import("@/lib/svc/host");
  const host = (await getHeaders()).get("host") ?? "";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const origin = isSvcHost(host) ? SVC_ORIGIN : `${proto}://${host}`;
  const callbackUrl = `${origin}${await svcPath("/account/tickets")}`;

  const result = await initializeSvcTicketCheckout({
    email: member.email,
    amountCents,
    callbackUrl,
    memberId: member.id,
    drawId: draw.id,
    ticketCount: count,
  });
  if ("error" in result) redirect(`${back}?tickets=failed`);
  redirect(result.authorizationUrl);
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
