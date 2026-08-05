"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { initInvoicePayment, outstandingCents } from "@/lib/bizup/pay-online";

/**
 * The public invoice's Pay now. No login, same as the page itself: the
 * unguessable token is the authorisation, and all this action can do with
 * it is send money TOWARDS the member. Paystack needs the payer's email
 * for the receipt, which is the one thing the form asks.
 */
export type PayOnlineState = { error?: string } | null;

export async function payInvoiceOnline(
  token: string,
  _prev: PayOnlineState,
  formData: FormData
): Promise<PayOnlineState> {
  const email = String(formData.get("payerEmail") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Enter the email address your payment receipt should go to." };
  }

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("bizup_documents")
    .select("id, account_id, number, doc_type, status, total_incl_cents, public_token")
    .eq("public_token", token)
    .maybeSingle();

  if (!doc || doc.doc_type !== "invoice") return { error: "This document cannot be paid online." };
  if (doc.status === "paid") return { error: "This invoice is already paid in full." };

  const owed = await outstandingCents(doc.id, doc.total_incl_cents);
  if (owed <= 0) return { error: "This invoice is already paid in full." };

  // The return URL is this same public page, on whichever hostname the
  // customer is looking at (katisobiz.co.za/d/... or the /bizup prefix
  // elsewhere) — the settle step runs there on arrival.
  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const prefix = host.toLowerCase().startsWith("katisobiz") ? "" : "/bizup";
  const callbackUrl = `${proto}://${host}${prefix}/d/${token}`;

  const result = await initInvoicePayment({
    accountId: doc.account_id,
    documentId: doc.id,
    documentNumber: doc.number ?? "invoice",
    amountCents: owed,
    customerEmail: email,
    callbackUrl,
  });

  if ("error" in result) {
    return { error: "Could not start the payment. Use the banking details above, or try again." };
  }

  redirect(result.authorizationUrl);
}
