"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/crypto";
import { sendEmail } from "@/lib/email/resend";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";
import {
  ACCOUNT_TYPES,
  BANK_NOTICE_STYLES,
  CODE_TTL_MINUTES,
  MAX_CODE_ATTEMPTS,
  generateConfirmationCode,
  hashConfirmationCode,
  isPlausibleAccountNumber,
  isValidBranchCode,
  lastFour,
  maskedAccountNumber,
  normaliseAccountNumber,
  verifyConfirmationCode,
  type AccountType,
  type BankNoticeStyle,
} from "@/lib/bizup/bank";

export type BankFormState = {
  error?: Record<string, string[]> & { _form?: string[] };
  pendingLast4?: string;
  done?: boolean;
} | null;

async function currentAccount() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("bizup_accounts")
    .select("id, business_name, email, phone, bank_notice_style, bank_notice_none_ack_at")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  return data ? { user, account: data, admin } : null;
}

/**
 * BizUp/docs/bizup-phase1-spec.md Sec 8, step one of a bank change.
 *
 * Nothing is written to bizup_bank_details here. The proposed details sit
 * in bizup_bank_change_requests until a code sent to the member's email is
 * typed back, so a session that has been taken over cannot redirect
 * payments on its own.
 */
export async function requestBankChange(
  _prevState: BankFormState,
  formData: FormData,
): Promise<BankFormState> {
  const ctx = await currentAccount();
  if (!ctx) return { error: { _form: ["Please log in again."] } };
  const { user, account, admin } = ctx;

  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`bizup-bank-change:${ip}`, 5, 30 * 60 * 1000)) {
    return { error: { _form: ["Too many attempts. Please wait a few minutes and try again."] } };
  }

  const bankName = String(formData.get("bankName") ?? "").trim();
  const accountHolder = String(formData.get("accountHolder") ?? "").trim();
  const accountNumberRaw = String(formData.get("accountNumber") ?? "");
  const branchCode = String(formData.get("branchCode") ?? "").replace(/\s/g, "");
  const accountType = String(formData.get("accountType") ?? "") as AccountType;

  const error: Record<string, string[]> = {};
  if (bankName.length < 2) error.bankName = ["Choose or enter your bank"];
  if (accountHolder.length < 2) error.accountHolder = ["Enter the name on the account"];
  if (!isPlausibleAccountNumber(accountNumberRaw))
    error.accountNumber = ["A South African account number is between 6 and 13 digits"];
  if (!isValidBranchCode(branchCode)) error.branchCode = ["A branch code is 6 digits"];
  if (!ACCOUNT_TYPES.includes(accountType)) error.accountType = ["Choose cheque or savings"];
  if (Object.keys(error).length > 0) return { error };

  const accountNumber = normaliseAccountNumber(accountNumberRaw);
  const code = generateConfirmationCode();

  // Any earlier pending request is superseded, not left to race with this
  // one. Marked cancelled rather than deleted: a record of attempted
  // banking changes is exactly what is wanted if money ever goes astray.
  await admin
    .from("bizup_bank_change_requests")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("account_id", account.id)
    .is("confirmed_at", null)
    .is("cancelled_at", null);

  const { error: insertError } = await admin.from("bizup_bank_change_requests").insert({
    account_id: account.id,
    bank_name: bankName,
    account_holder: accountHolder,
    account_number_encrypted: encrypt(accountNumber),
    account_number_last4: lastFour(accountNumber),
    branch_code: branchCode,
    account_type: accountType,
    code_hash: hashConfirmationCode(account.id, code),
    expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString(),
  });

  if (insertError) {
    console.error("Failed to create bank change request", insertError);
    return { error: { _form: ["We couldn't start that change. Please try again."] } };
  }

  // Awaited, not fired and forgotten. Both a bare promise and next/server's
  // after() were tested on this deployment and neither reliably completed,
  // and a member left waiting for a code that was never sent has no way
  // forward.
  const sent = await sendEmail({
    to: account.email,
    subject: `Your KatisoBiz code to change banking details: ${code}`,
    html: `
      <p>Good day ${account.business_name},</p>
      <p>Someone asked to change the banking details that appear on your KatisoBiz invoices, to an account ending in <strong>${lastFour(accountNumber)}</strong> at ${bankName}.</p>
      <p>To confirm this change, type this code into KatisoBiz:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:4px;margin:20px 0;">${code}</p>
      <p>The code expires in ${CODE_TTL_MINUTES} minutes.</p>
      <p><strong>If this was not you, do not enter the code.</strong> Your banking details have not changed, and they will not change unless this code is entered. Please reply to this email so we can help you secure your account.</p>
      <p>DigitalFlyer SA</p>
    `,
  });

  if (!sent.ok) {
    console.error("Failed to send bank change code", sent.error);
    return { error: { _form: ["We couldn't send the confirmation code. Please try again."] } };
  }

  await admin.from("bizup_audit_log").insert({
    account_id: account.id,
    actor_user_id: user.id,
    action: "bank_change_requested",
    reason: `Requested change to ${bankName}, account ending ${lastFour(accountNumber)}`,
  });

  revalidatePath("/bizup/settings/banking");
  return { pendingLast4: lastFour(accountNumber) };
}

/**
 * Sec 8, step two. The typed code is what actually moves the details onto
 * the live record.
 */
export async function confirmBankChange(
  _prevState: BankFormState,
  formData: FormData,
): Promise<BankFormState> {
  const ctx = await currentAccount();
  if (!ctx) return { error: { _form: ["Please log in again."] } };
  const { user, account, admin } = ctx;

  const code = String(formData.get("code") ?? "").replace(/\s/g, "");

  const { data: request } = await admin
    .from("bizup_bank_change_requests")
    .select("*")
    .eq("account_id", account.id)
    .is("confirmed_at", null)
    .is("cancelled_at", null)
    .maybeSingle();

  if (!request) {
    return { error: { _form: ["That request is no longer active. Please start again."] } };
  }

  if (new Date(request.expires_at) < new Date()) {
    await admin
      .from("bizup_bank_change_requests")
      .update({ cancelled_at: new Date().toISOString() })
      .eq("id", request.id);
    return { error: { code: ["That code has expired. Please start again."] } };
  }

  if (request.attempts >= MAX_CODE_ATTEMPTS) {
    await admin
      .from("bizup_bank_change_requests")
      .update({ cancelled_at: new Date().toISOString() })
      .eq("id", request.id);
    await admin.from("bizup_audit_log").insert({
      account_id: account.id,
      actor_user_id: user.id,
      action: "bank_change_blocked_too_many_attempts",
    });
    return { error: { _form: ["Too many incorrect codes. That request has been cancelled."] } };
  }

  if (!verifyConfirmationCode(account.id, code, request.code_hash)) {
    // Counted before anything else, so a wrong guess costs an attempt even
    // if the caller abandons the request immediately afterwards.
    await admin
      .from("bizup_bank_change_requests")
      .update({ attempts: request.attempts + 1 })
      .eq("id", request.id);
    const left = MAX_CODE_ATTEMPTS - (request.attempts + 1);
    return {
      error: {
        code: [left > 0 ? `That code is not right. ${left} attempts left.` : "That code is not right."],
      },
    };
  }

  const now = new Date().toISOString();

  // Upsert on the primary key: an account has exactly one set of live
  // banking details, and a second row would mean an invoice could print
  // the wrong account.
  const { error: upsertError } = await admin.from("bizup_bank_details").upsert(
    {
      account_id: account.id,
      bank_name: request.bank_name,
      account_holder: request.account_holder,
      account_number_encrypted: request.account_number_encrypted,
      account_number_last4: request.account_number_last4,
      branch_code: request.branch_code,
      account_type: request.account_type,
      last_confirmed_at: now,
      updated_at: now,
    },
    { onConflict: "account_id" },
  );

  if (upsertError) {
    console.error("Failed to apply confirmed bank details", upsertError);
    return { error: { _form: ["We couldn't save that. Please try again."] } };
  }

  await admin
    .from("bizup_bank_change_requests")
    .update({ confirmed_at: now })
    .eq("id", request.id);

  await admin.from("bizup_audit_log").insert({
    account_id: account.id,
    actor_user_id: user.id,
    action: "bank_details_changed",
    reason: `Confirmed by code. Now ${request.bank_name}, account ending ${request.account_number_last4}`,
  });

  revalidatePath("/bizup/settings/banking");
  revalidatePath("/bizup");
  return { done: true };
}

/** Lets a member abandon a change they started, without waiting for it to expire. */
export async function cancelBankChange(): Promise<void> {
  const ctx = await currentAccount();
  if (!ctx) return;
  const { user, account, admin } = ctx;

  await admin
    .from("bizup_bank_change_requests")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("account_id", account.id)
    .is("confirmed_at", null)
    .is("cancelled_at", null);

  await admin.from("bizup_audit_log").insert({
    account_id: account.id,
    actor_user_id: user.id,
    action: "bank_change_cancelled_by_member",
  });

  revalidatePath("/bizup/settings/banking");
}

/**
 * Sec 8, the invoice interception fraud notice.
 *
 * Not gated behind a confirmation code: this changes wording printed on
 * the member's own documents, it cannot redirect a payment. Switching it
 * off does show a one-time warning, and the choice is logged.
 */
export async function updateBankNoticeStyle(
  _prevState: BankFormState,
  formData: FormData,
): Promise<BankFormState> {
  const ctx = await currentAccount();
  if (!ctx) return { error: { _form: ["Please log in again."] } };
  const { user, account, admin } = ctx;

  const style = String(formData.get("bankNoticeStyle") ?? "") as BankNoticeStyle;
  if (!BANK_NOTICE_STYLES.includes(style)) {
    return { error: { bankNoticeStyle: ["Choose one of the options"] } };
  }

  const { error } = await admin
    .from("bizup_accounts")
    .update({
      bank_notice_style: style,
      // Stamped the first time the notice is switched off, so the warning
      // is shown once and never nagged about again.
      bank_notice_none_ack_at:
        style === "none" && !account.bank_notice_none_ack_at
          ? new Date().toISOString()
          : account.bank_notice_none_ack_at,
      updated_at: new Date().toISOString(),
    })
    .eq("id", account.id);

  if (error) {
    console.error("Failed to update bank notice style", error);
    return { error: { _form: ["We couldn't save that. Please try again."] } };
  }

  if (style !== account.bank_notice_style) {
    await admin.from("bizup_audit_log").insert({
      account_id: account.id,
      actor_user_id: user.id,
      action: "bank_notice_style_changed",
      from_status: account.bank_notice_style,
      to_status: style,
    });
  }

  revalidatePath("/bizup/settings/banking");
  return { done: true };
}

/** Read side for the banking screen. Never returns the encrypted number. */
export async function getBankSummary(): Promise<{
  masked: string | null;
  bankName: string | null;
  accountHolder: string | null;
  branchCode: string | null;
  accountType: string | null;
  lastConfirmedAt: string | null;
  pendingLast4: string | null;
  pendingBankName: string | null;
} | null> {
  const ctx = await currentAccount();
  if (!ctx) return null;
  const { account, admin } = ctx;

  const [{ data: live }, { data: pending }] = await Promise.all([
    admin
      .from("bizup_bank_details")
      .select("bank_name, account_holder, account_number_last4, branch_code, account_type, last_confirmed_at")
      .eq("account_id", account.id)
      .maybeSingle(),
    admin
      .from("bizup_bank_change_requests")
      .select("account_number_last4, bank_name")
      .eq("account_id", account.id)
      .is("confirmed_at", null)
      .is("cancelled_at", null)
      .maybeSingle(),
  ]);

  return {
    masked: live ? maskedAccountNumber(live.account_number_last4) : null,
    bankName: live?.bank_name ?? null,
    accountHolder: live?.account_holder ?? null,
    branchCode: live?.branch_code ?? null,
    accountType: live?.account_type ?? null,
    lastConfirmedAt: live?.last_confirmed_at ?? null,
    pendingLast4: pending?.account_number_last4 ?? null,
    pendingBankName: pending?.bank_name ?? null,
  };
}
