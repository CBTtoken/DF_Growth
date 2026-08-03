"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSvcClient } from "@/lib/svc/db";
import { svcPath, isSvcHost, SVC_ORIGIN } from "@/lib/svc/host";
import { getCurrentMember } from "@/lib/svc/member";
import { getPackageBySlug } from "@/lib/svc/data";
import { initializeSvcCheckout } from "@/lib/svc/payments";

/**
 * Creates the pending subscription and hands the member to Paystack's
 * hosted checkout (test mode until SVC's own account is live). The
 * subscription activates only when the SVC webhook sees the payment;
 * nothing here marks anything paid.
 */
export async function startCheckout(formData: FormData) {
  const slug = String(formData.get("package") ?? "svc-membership");

  const member = await getCurrentMember();
  if (!member) redirect(await svcPath("/join"));
  if (!member!.cell_verified_at) {
    redirect(`${await svcPath("/join/verify")}?package=${encodeURIComponent(slug)}`);
  }

  const pkg = await getPackageBySlug(slug);
  if (!pkg) {
    redirect(`${await svcPath("/join/checkout")}?package=${encodeURIComponent(slug)}&error=package`);
  }

  const db = createSvcClient();

  // One pending subscription per member and package at a time; a retry
  // reuses it rather than stacking rows.
  const { data: existing } = await db
    .from("subscription")
    .select("id, status")
    .eq("member_id", member!.id)
    .eq("package_id", pkg!.id)
    .in("status", ["pending_payment", "active"])
    .maybeSingle();

  if (existing?.status === "active") {
    redirect(await svcPath("/account"));
  }

  let subscriptionId = existing?.id ?? null;
  if (!subscriptionId) {
    const { data: created, error } = await db
      .from("subscription")
      .insert({
        member_id: member!.id,
        package_id: pkg!.id,
        status: "pending_payment",
        billing_interval: "monthly",
      })
      .select("id")
      .single();
    if (error || !created) {
      console.error("SVC subscription insert failed", error);
      redirect(`${await svcPath("/join/checkout")}?package=${encodeURIComponent(slug)}&error=failed`);
    }
    subscriptionId = created!.id;
  }

  // The callback returns to whichever hostname the member is actually on,
  // same reasoning as Moxie's subscribe action.
  const host = (await headers()).get("host") ?? "";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const origin = isSvcHost(host) ? SVC_ORIGIN : `${proto}://${host}`;
  const callbackUrl = `${origin}${await svcPath("/welcome")}`;

  const result = await initializeSvcCheckout({
    email: member!.email,
    amountCents: pkg!.monthly_price_cents,
    callbackUrl,
    memberId: member!.id,
    subscriptionId: subscriptionId!,
    packageId: pkg!.id,
    interval: "monthly",
  });

  if ("error" in result) {
    redirect(`${await svcPath("/join/checkout")}?package=${encodeURIComponent(slug)}&error=${result.error}`);
  }

  redirect(result.authorizationUrl);
}
