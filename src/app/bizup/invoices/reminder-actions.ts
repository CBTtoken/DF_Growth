"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentAccount } from "@/lib/bizup/documents";
import { bizupLoginPath, isKatisoBizHost } from "@/lib/bizup/product";
import { reminderMessage } from "@/lib/bizup/reminders";
import { toWhatsAppNumber } from "@/lib/bizup/whatsapp";

/**
 * Prepares a payment reminder and hands off to WhatsApp.
 *
 * This records that a reminder was prepared and then sends the member to
 * wa.me with the message already written. It does not message anybody.
 * The member presses send, from their own number, exactly as they do with
 * a quote. Nothing in KatisoBiz ever contacts a member's customer on its
 * own initiative.
 */
export async function remindAboutInvoice(formData: FormData): Promise<void> {
  const documentId = String(formData.get("documentId") ?? "");
  const account = await currentAccount();
  if (!account) redirect(await bizupLoginPath());

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("bizup_documents")
    .select(
      "id, number, due_date, total_incl_cents, public_token, reminder_count, bizup_customers(name, whatsapp, phone)",
    )
    .eq("id", documentId)
    .eq("account_id", account.id)
    .eq("doc_type", "invoice")
    .maybeSingle();

  if (!doc?.number) redirect("/bizup/invoices");

  // Chase what is actually still owed, not the face value. Reminding
  // someone for the full amount after they have paid half is the fastest
  // way to look disorganised.
  const { data: payments } = await admin
    .from("bizup_payments")
    .select("amount_cents")
    .eq("document_id", documentId);

  const paid = (payments ?? []).reduce((s, p) => s + p.amount_cents, 0);
  const outstanding = doc.total_incl_cents - paid;
  if (outstanding <= 0) redirect(`/bizup/invoices/${documentId}`);

  const customer = doc.bizup_customers as unknown as {
    name: string;
    whatsapp: string | null;
    phone: string | null;
  } | null;

  const host = (await headers()).get("host") ?? "katisobiz.co.za";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const prefix = isKatisoBizHost(host) ? "" : "/bizup";
  const publicUrl = doc.public_token
    ? `${protocol}://${host}${prefix}/d/${doc.public_token}`
    : "";

  const message = reminderMessage({
    customerName: customer?.name ?? null,
    businessName: account.business_name,
    number: doc.number,
    outstandingCents: outstanding,
    dueDate: doc.due_date,
    publicUrl,
  });

  await admin
    .from("bizup_documents")
    .update({
      last_reminded_at: new Date().toISOString(),
      reminder_count: (doc.reminder_count ?? 0) + 1,
    })
    .eq("id", documentId)
    .eq("account_id", account.id);

  await admin.from("bizup_audit_log").insert({
    account_id: account.id,
    document_id: documentId,
    action: "reminder_prepared",
    reason: doc.number,
  });

  revalidatePath("/bizup");
  revalidatePath(`/bizup/invoices/${documentId}`);

  // No number on file opens WhatsApp's own contact picker, which is the
  // right fallback rather than an error: the member usually knows the
  // number even when the customer record does not.
  const number = toWhatsAppNumber(customer?.whatsapp ?? customer?.phone ?? null);
  const target = number ? `https://wa.me/${number}` : "https://wa.me/";
  redirect(`${target}?text=${encodeURIComponent(message)}`);
}
