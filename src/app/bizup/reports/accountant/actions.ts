"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { capabilitiesFor, type BizUpPlan } from "@/lib/bizup/entitlements";
import { resolvePeriod } from "@/lib/bizup/period";
import { bizupLoginPath, isKatisoBizHost } from "@/lib/bizup/product";

// How long an export link lasts.
//
// Seven days, not fourteen, because the approved terms of service say
// seven in clause A5.2. Where the published terms and the code disagree,
// the code moves: a term we do not honour is worse than no term, and this
// one costs nothing to keep.
const LINK_DAYS = 7;

export async function createAccountantExportLink(formData: FormData): Promise<void> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(await bizupLoginPath());

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("bizup_accounts")
    .select("id, plan, financial_year_end_month")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!account) redirect("/bizup/start");
  if (!capabilitiesFor(account.plan as BizUpPlan).accountantExport) redirect("/bizup/upgrade");

  const period = resolvePeriod(
    String(formData.get("period") ?? ""),
    account.financial_year_end_month,
    { from: String(formData.get("from") ?? ""), to: String(formData.get("to") ?? "") },
  );

  // 32 random bytes. This token is the only thing protecting a member's
  // customer list, so it is generated server side with a CSPRNG and never
  // derived from anything guessable like an account id or a timestamp.
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + LINK_DAYS * 24 * 60 * 60 * 1000);

  await admin.from("bizup_export_links").insert({
    account_id: account.id,
    token,
    period_from: period.from,
    period_to: period.to,
    expires_at: expires.toISOString(),
  });

  await admin.from("bizup_audit_log").insert({
    account_id: account.id,
    actor_user_id: user.id,
    action: "accountant_export_link_created",
    reason: `${period.from} to ${period.to}, expires ${expires.toISOString().slice(0, 10)}`,
  });

  revalidatePath("/bizup/reports/accountant");
  redirect(`/bizup/reports/accountant?created=${token}&period=${period.id}&from=${period.from}&to=${period.to}`);
}

export async function revokeAccountantExportLink(formData: FormData): Promise<void> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("bizup_accounts")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!account) return;

  // Scoped to the caller's account as well as the id. This runs with the
  // service role, so the id alone would let a hand-edited form revoke
  // someone else's link.
  await admin
    .from("bizup_export_links")
    .delete()
    .eq("id", String(formData.get("id") ?? ""))
    .eq("account_id", account.id);

  revalidatePath("/bizup/reports/accountant");
}

/** The full URL to hand to an accountant, on whichever host the member is using. */
export async function exportLinkUrl(token: string): Promise<string> {
  const host = (await headers()).get("host") ?? "katisobiz.co.za";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const prefix = isKatisoBizHost(host) ? "" : "/katisobiz";
  return `${protocol}://${host}${prefix}/x/${token}`;
}
