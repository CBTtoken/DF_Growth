"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentAccount } from "@/lib/bizup/documents";
import { bizupLoginPath, isKatisoBizHost } from "@/lib/bizup/product";
import { reviewRequestMessage } from "@/lib/reviews/request-message";
import { toWhatsAppNumber } from "@/lib/bizup/whatsapp";

// Handoff: scripts/handoff-unified-account-and-reviews.md, Job 4.
//
// Mirrors remindAboutInvoice in reminder-actions.ts exactly: prepares the
// message and hands off to WhatsApp with it pre-written. The member presses
// send from their own number. Nothing here ever contacts a customer on its
// own initiative, and this never sends automatically or repeatedly — a
// second request only happens if the member deliberately presses the
// button again.
export async function requestReviewForInvoice(formData: FormData): Promise<void> {
  const documentId = String(formData.get("documentId") ?? "");
  const account = await currentAccount();
  if (!account) redirect(await bizupLoginPath());

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("bizup_documents")
    .select("id, number, total_incl_cents, bizup_customers(name, whatsapp, phone)")
    .eq("id", documentId)
    .eq("account_id", account.id)
    .eq("doc_type", "invoice")
    .maybeSingle();

  if (!doc?.number) redirect("/bizup/invoices");

  // Only offered once the invoice is actually settled — chasing a review on
  // money still owed is the wrong ask at the wrong time.
  const { data: payments } = await admin
    .from("bizup_payments")
    .select("amount_cents")
    .eq("document_id", documentId);
  const paid = (payments ?? []).reduce((s, p) => s + p.amount_cents, 0);
  if (paid < doc.total_incl_cents) redirect(`/bizup/invoices/${documentId}`);

  const customer = doc.bizup_customers as unknown as {
    name: string;
    whatsapp: string | null;
    phone: string | null;
  } | null;

  // Where the link points: the business's own Growth review form when it
  // has a live page, otherwise the plain KatisoBiz capture page — which is
  // already there the moment this account gets linked to a Growth business
  // later, per Job 1 (the reviews query on the Growth page reads by linked
  // bizup_account_id as well as business_id). currentAccount() doesn't
  // select growth_client_id (most of its many callers have no use for it),
  // so this asks for just that one column rather than widening a shared
  // helper for a single call site.
  const { data: linkAccount } = await admin
    .from("bizup_accounts")
    .select("growth_client_id")
    .eq("id", account.id)
    .single();

  const { data: linkedClient } = linkAccount?.growth_client_id
    ? await admin
        .from("growth_clients")
        .select("slug")
        .eq("id", linkAccount.growth_client_id)
        .eq("status", "active")
        .maybeSingle()
    : { data: null };

  const host = (await headers()).get("host") ?? "katisobiz.co.za";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const prefix = isKatisoBizHost(host) ? "" : "/katisobiz";
  const reviewUrl = linkedClient?.slug
    ? `${protocol}://${host.startsWith("localhost") ? host : "growth.digitalflyersa.co.za"}/${linkedClient.slug}#reviews`
    : `${protocol}://${host}${prefix}/review/${account.id}`;

  const message = reviewRequestMessage({
    customerName: customer?.name ?? null,
    businessName: account.business_name,
    reviewUrl,
    invoice: { number: doc.number, totalCents: doc.total_incl_cents },
  });

  await admin
    .from("bizup_documents")
    .update({ review_requested_at: new Date().toISOString() })
    .eq("id", documentId)
    .eq("account_id", account.id);

  await admin.from("bizup_audit_log").insert({
    account_id: account.id,
    document_id: documentId,
    action: "review_requested",
    reason: doc.number,
  });

  revalidatePath("/bizup");
  revalidatePath(`/bizup/invoices/${documentId}`);

  const number = toWhatsAppNumber(customer?.whatsapp ?? customer?.phone ?? null);
  const target = number ? `https://wa.me/${number}` : "https://wa.me/";
  redirect(`${target}?text=${encodeURIComponent(message)}`);
}
