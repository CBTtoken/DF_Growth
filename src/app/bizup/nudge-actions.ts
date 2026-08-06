"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Handoff: scripts/handoff-activation-nudges-and-emails.md, Jobs 4, 5, 6.
//
// Every action here does the same two things: confirm the account behind
// the login, then write one column on it. No shared "current account"
// import from lib/bizup/documents.ts's currentAccount() — that one selects
// a specific, larger column list tuned for the document builder, and
// widening it for four prompt-only columns isn't worth touching a helper
// this many other files depend on for one write path.
async function currentAccountId(): Promise<string | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin.from("bizup_accounts").select("id").eq("owner_user_id", user.id).maybeSingle();
  return data?.id ?? null;
}

export async function answerWebsiteQuestion(formData: FormData): Promise<void> {
  const accountId = await currentAccountId();
  if (!accountId) return;

  const status = String(formData.get("status") ?? "");
  if (!["has_website", "social_only", "none"].includes(status)) return;

  const admin = createAdminClient();
  await admin
    .from("bizup_accounts")
    .update({ website_status: status, website_status_dismissed_at: new Date().toISOString() })
    .eq("id", accountId);

  revalidatePath("/bizup");
}

export async function dismissWebsiteQuestion(): Promise<void> {
  const accountId = await currentAccountId();
  if (!accountId) return;

  const admin = createAdminClient();
  await admin.from("bizup_accounts").update({ website_status_dismissed_at: new Date().toISOString() }).eq("id", accountId);

  revalidatePath("/bizup");
}

export async function dismissReviewWedge(): Promise<void> {
  const accountId = await currentAccountId();
  if (!accountId) return;

  const admin = createAdminClient();
  await admin.from("bizup_accounts").update({ review_wedge_dismissed_at: new Date().toISOString() }).eq("id", accountId);

  revalidatePath("/bizup");
}

export async function dismissQuoteNudge(): Promise<void> {
  const accountId = await currentAccountId();
  if (!accountId) return;

  const admin = createAdminClient();
  await admin.from("bizup_accounts").update({ quote_nudge_dismissed_at: new Date().toISOString() }).eq("id", accountId);

  revalidatePath("/bizup");
}
