"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { isKatisoBizHost, bizupLoginPath } from "@/lib/bizup/product";
import { initializeBizUpSubscription, initializeBizUpTopup } from "@/lib/bizup/billing";

// The landing page has promised both of these all along: "You choose a
// paid plan later, from inside KatisoBiz" and "Top up for another 75
// documents for R49". Neither existed, so a member who wanted to pay us
// could not.

async function accountForBilling() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("bizup_accounts")
    .select("id, email, plan, plan_source")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  return data ?? null;
}

/** Where Paystack sends the member back to. Same prefix rule as everywhere else. */
async function callbackUrl(): Promise<string> {
  const host = (await headers()).get("host") ?? "katisobiz.co.za";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const prefix = isKatisoBizHost(host) ? "" : "/bizup";
  return `${protocol}://${host}${prefix}/upgrade/done`;
}

export async function startBizUpUpgrade(formData: FormData): Promise<void> {
  const account = await accountForBilling();
  if (!account) redirect(await bizupLoginPath());

  // A member whose plan comes bundled with Growth must not be sold a
  // second subscription for something they already have. Sec 2's bundling
  // table gives Growth Engine and Enterprise the R49 tier at no extra
  // cost, and charging them again would be the worst kind of billing bug.
  if (account.plan_source !== "self_paid" && account.plan !== "free") {
    redirect("/bizup/upgrade?already=1");
  }

  const plan = formData.get("plan") === "unlimited" ? "unlimited" : "paid";

  const result = await initializeBizUpSubscription({
    accountId: account.id,
    email: account.email,
    plan,
    callbackUrl: await callbackUrl(),
  });

  if ("error" in result) redirect("/bizup/upgrade?error=1");
  redirect(result.authorizationUrl);
}

export async function startBizUpTopup(): Promise<void> {
  const account = await accountForBilling();
  if (!account) redirect(await bizupLoginPath());

  const result = await initializeBizUpTopup({
    accountId: account.id,
    email: account.email,
    callbackUrl: await callbackUrl(),
  });

  if ("error" in result) redirect("/bizup/upgrade?error=1");
  redirect(result.authorizationUrl);
}
