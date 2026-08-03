import "server-only";

import { createSvcClient } from "@/lib/svc/db";
import { sendEmail } from "@/lib/email/resend";
import { SVC_ORIGIN } from "@/lib/svc/host";

/**
 * Membership activation, shared by the two paths that can learn about a
 * successful payment:
 *
 *  1. SVC's own webhook (/api/svc/webhooks/paystack), once SVC has a
 *     Paystack account whose webhook can be pointed at it.
 *  2. Server-side verification on the payment callback (/svc/welcome),
 *     which needs NO webhook at all. This is the live path while SVC
 *     borrows the shared DF TEST account, whose webhook must not be
 *     repointed because the WhatsApp project depends on it (handoff 3.1,
 *     and it has broken WhatsApp delivery once before).
 *
 * Both paths funnel through here, deduplicated on the provider's
 * transaction reference, so a payment seen by both activates exactly once.
 */
export async function activateSvcMembership({
  reference,
  eventType,
  memberId,
  subscriptionId,
  amountCents,
  interval,
  customerCode,
  planCode,
  payload,
}: {
  reference: string;
  eventType: string;
  memberId: string;
  subscriptionId: string;
  amountCents: number | null;
  interval?: string;
  customerCode?: string | null;
  planCode?: string | null;
  payload: unknown;
}): Promise<{ activated: boolean; duplicate: boolean }> {
  const db = createSvcClient();

  const { error: dedupError } = await db.from("payment_event").insert({
    provider: "paystack",
    provider_reference: reference,
    event_type: eventType,
    member_id: memberId,
    subscription_id: subscriptionId,
    amount_cents: amountCents,
    payload,
  });
  if (dedupError) {
    if (dedupError.code === "23505") return { activated: false, duplicate: true };
    console.error("SVC payment event insert failed", dedupError);
    return { activated: false, duplicate: false };
  }

  const now = new Date();
  const periodEnd = new Date(now);
  if (interval === "annual") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { error: subError } = await db
    .from("subscription")
    .update({
      status: "active",
      started_at: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      provider_customer_code: customerCode ?? null,
      provider_plan_code: planCode ?? null,
      updated_at: now.toISOString(),
    })
    .eq("id", subscriptionId);
  if (subError) console.error("SVC subscription activation failed", subError);

  const { error: memberError } = await db
    .from("member")
    .update({ status: "active", updated_at: now.toISOString() })
    .eq("id", memberId);
  if (memberError) console.error("SVC member activation failed", memberError);

  const { data: member } = await db
    .from("member")
    .select("email, first_name")
    .eq("id", memberId)
    .maybeSingle();

  if (member?.email) {
    const { ok, error: mailError } = await sendEmail({
      to: member.email,
      subject: "Welcome to Smart Value Club",
      fromName: "Smart Value Club",
      html: `
        <p style="font-size:15px;line-height:1.65;color:#1a1a1a;margin:0 0 16px;">Good day ${member.first_name},</p>
        <p style="font-size:15px;line-height:1.65;color:#1a1a1a;margin:0 0 16px;">
          Your Smart Value Club membership is active. Your benefits are issued on the
          1st of every month, and we will email you the moment they are ready.
        </p>
        <p style="font-size:15px;line-height:1.65;color:#1a1a1a;margin:0 0 16px;">
          Your dashboard shows your coupons, your draw entries and the Rand value you
          have actually saved.
        </p>
        <p style="margin:24px 0;">
          <a href="${SVC_ORIGIN}/account" style="display:inline-block;background:#1a6b3c;color:#ffffff;font-size:15px;font-weight:700;padding:13px 26px;text-decoration:none;">Open my dashboard</a>
        </p>
        <p style="font-size:15px;line-height:1.65;color:#1a1a1a;margin:0;">Welcome to the club.<br />Smart Value Club</p>
      `,
    });
    if (!ok) console.error("SVC welcome email failed", mailError);
  }

  return { activated: true, duplicate: false };
}
