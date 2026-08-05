import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";

/**
 * KatisoBiz Pay Now: an invoice's public link takes payment on the
 * member's own Paystack account.
 *
 * The estate's one payment law holds here exactly as it does in the Growth
 * shop: the customer pays the member's own gateway, the money lands in the
 * member's own account, and no DigitalFlyer key exists anywhere on this
 * path. (DigitalFlyer's own invoices qualify because DigitalFlyer is
 * itself a KatisoBiz account with its own connected key, not because
 * anything special-cases it.)
 *
 * References are `kbiz_{documentId}_{timestamp}`: unique per attempt as
 * Paystack requires, carrying the document id so the settle step can find
 * its way back with nothing but the reference.
 */

export async function accountPaystackKey(accountId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bizup_accounts")
    .select("paystack_secret_encrypted")
    .eq("id", accountId)
    .maybeSingle();
  if (!data?.paystack_secret_encrypted) return null;
  try {
    return decrypt(data.paystack_secret_encrypted);
  } catch (err) {
    console.error("Could not decrypt BizUp Paystack key", accountId, err);
    return null;
  }
}

/** What is still owed on a document, from its payments ledger. */
export async function outstandingCents(documentId: string, totalInclCents: number): Promise<number> {
  const admin = createAdminClient();
  const { data: payments } = await admin
    .from("bizup_payments")
    .select("amount_cents")
    .eq("document_id", documentId);
  const paid = (payments ?? []).reduce((s, p) => s + p.amount_cents, 0);
  return Math.max(0, totalInclCents - paid);
}

export async function initInvoicePayment({
  accountId,
  documentId,
  documentNumber,
  amountCents,
  customerEmail,
  callbackUrl,
}: {
  accountId: string;
  documentId: string;
  documentNumber: string;
  amountCents: number;
  customerEmail: string;
  callbackUrl: string;
}): Promise<{ authorizationUrl: string; reference: string } | { error: string }> {
  const secret = await accountPaystackKey(accountId);
  if (!secret) return { error: "no_gateway" };

  const reference = `kbiz_${documentId}_${Date.now()}`;
  try {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: customerEmail,
        amount: amountCents,
        currency: "ZAR",
        reference,
        callback_url: callbackUrl,
        metadata: { document_id: documentId, document_number: documentNumber, source: "katisobiz_pay_now" },
      }),
    });
    const data = await res.json();
    if (!data.status || !data.data?.authorization_url) {
      console.error("BizUp Paystack initialize failed", accountId, data?.message);
      return { error: "initialize_failed" };
    }
    return { authorizationUrl: data.data.authorization_url, reference };
  } catch (err) {
    console.error("BizUp Paystack initialize threw", accountId, err);
    return { error: "initialize_failed" };
  }
}

/**
 * The way back from Paystack's page. Verified against Paystack's own API,
 * never against the URL the browser returned with; recorded once per
 * reference (a refresh replays nothing); and the invoice status is
 * recomputed from the whole payments ledger, the same rule
 * recordPayment already follows so the two paths can never disagree.
 */
export async function settleInvoicePayment(
  token: string,
  reference: string
): Promise<{ settled: boolean; alreadyRecorded: boolean }> {
  if (!/^kbiz_[0-9a-f-]{36}_\d+$/i.test(reference)) return { settled: false, alreadyRecorded: false };

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("bizup_documents")
    .select("id, account_id, number, status, total_incl_cents, doc_type, public_token")
    .eq("public_token", token)
    .maybeSingle();

  // The reference must belong to this document: nobody settles invoice A
  // with a reference minted for invoice B.
  if (!doc || doc.doc_type !== "invoice") return { settled: false, alreadyRecorded: false };
  if (!reference.startsWith(`kbiz_${doc.id}_`)) return { settled: false, alreadyRecorded: false };

  // Already recorded: a refresh of the return URL changes nothing.
  const { data: existing } = await admin
    .from("bizup_payments")
    .select("id")
    .eq("document_id", doc.id)
    .eq("reference", reference)
    .maybeSingle();
  if (existing) return { settled: true, alreadyRecorded: true };

  const secret = await accountPaystackKey(doc.account_id);
  if (!secret) return { settled: false, alreadyRecorded: false };

  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const data = await res.json();
    if (!data.status || data.data?.status !== "success") return { settled: false, alreadyRecorded: false };

    const amountCents = Number(data.data.amount ?? 0);
    if (amountCents <= 0) return { settled: false, alreadyRecorded: false };

    await admin.from("bizup_payments").insert({
      document_id: doc.id,
      amount_cents: amountCents,
      paid_at: new Date().toISOString().slice(0, 10),
      method: "paystack",
      reference,
      note: "Paid online via the invoice link",
    });

    // Same recompute-from-the-ledger rule as recordPayment: an issued
    // invoice becomes paid or partially_paid; a draft keeps its status so
    // it stays issuable.
    const { data: payments } = await admin
      .from("bizup_payments")
      .select("amount_cents")
      .eq("document_id", doc.id);
    const paid = (payments ?? []).reduce((s, p) => s + p.amount_cents, 0);
    const issued = doc.number !== null;
    const status = !issued ? doc.status : paid >= doc.total_incl_cents ? "paid" : "partially_paid";
    if (status !== doc.status) {
      await admin.from("bizup_documents").update({ status }).eq("id", doc.id);
    }

    await admin.from("bizup_audit_log").insert({
      account_id: doc.account_id,
      document_id: doc.id,
      action: "payment_recorded",
      from_status: doc.status,
      to_status: status,
      reason: `${amountCents} cents online via Paystack (${reference})`,
    });

    return { settled: true, alreadyRecorded: false };
  } catch (err) {
    console.error("BizUp Paystack settle threw", err);
    return { settled: false, alreadyRecorded: false };
  }
}
