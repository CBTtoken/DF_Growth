import crypto from "crypto";

// BizUp/docs/bizup-phase1-spec.md Sec 8, banking details.
//
// Two rules this file exists to enforce, both structural rather than
// conventional:
//
//   1. The full account number is decrypted in exactly one place, the
//      document render path. Everything that merely displays it uses the
//      stored last four digits, so no display path ever needs the key.
//   2. A change to banking details is confirmed by a code the member types
//      back, never by a link they click. See the migration comment on
//      bizup_bank_change_requests for why a link is unsafe here
//      specifically.

export const ACCOUNT_TYPES = ["cheque", "savings"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/**
 * South African universal branch codes, offered as a convenience so a
 * member on a phone does not have to find one. A wrong branch code means a
 * failed payment, which is why these are checked rather than remembered.
 *
 * Verified 27 July 2026 against two independent sources that agreed on
 * every value: Peach Payments' operational list (a payment processor, so
 * these are codes actually in use) and a published branch code directory.
 *
 * The field stays editable and this is only a prefill. A member banking
 * with a branch that does not use the universal code must be able to
 * override it, and no validation here can confirm an account exists.
 *
 * Re-check before any future launch: bank names and codes do change. This
 * list has already needed one correction, see GoTyme below.
 */
export const SA_BANKS: { name: string; branchCode: string }[] = [
  { name: "Absa", branchCode: "632005" },
  { name: "African Bank", branchCode: "430000" },
  { name: "Bidvest Bank", branchCode: "462005" },
  { name: "Capitec", branchCode: "470010" },
  { name: "Discovery Bank", branchCode: "679000" },
  { name: "First National Bank", branchCode: "250655" },
  // TymeBank formally became GoTyme Bank on 13 April 2026, confirmed by the
  // South African Reserve Bank in the Government Gazette. The branch code
  // did not change. Both names are shown because a member who opened the
  // account before the rebrand will still be looking for "TymeBank" in this
  // list, and will not find their bank if only the new name appears.
  { name: "GoTyme Bank (previously TymeBank)", branchCode: "678910" },
  { name: "Investec", branchCode: "580105" },
  { name: "Nedbank", branchCode: "198765" },
  { name: "Standard Bank", branchCode: "051001" },
];

/** Digits only. Members paste from banking apps, which add spaces and dashes. */
export function normaliseAccountNumber(input: string): string {
  return input.replace(/[^0-9]/g, "");
}

/**
 * South African account numbers run roughly 6 to 13 digits depending on
 * the bank, so this is a sanity check rather than a validation that could
 * ever confirm the account exists. Nothing in this product can do that.
 */
export function isPlausibleAccountNumber(input: string): boolean {
  const digits = normaliseAccountNumber(input);
  return digits.length >= 6 && digits.length <= 13;
}

export function isValidBranchCode(input: string): boolean {
  return /^\d{6}$/.test(input.replace(/\s/g, ""));
}

/** The last four digits, stored alongside the ciphertext so display never needs the key. */
export function lastFour(accountNumber: string): string {
  return normaliseAccountNumber(accountNumber).slice(-4);
}

/** What the member sees everywhere in their own dashboard after first entry. */
export function maskedAccountNumber(last4: string): string {
  return `••••••${last4}`;
}

// ============================================================
// Confirmation codes
// ============================================================

export const CODE_LENGTH = 6;
export const MAX_CODE_ATTEMPTS = 5;
export const CODE_TTL_MINUTES = 30;

/**
 * A six digit code. crypto.randomInt, not Math.random: this is the only
 * thing standing between a compromised session and a redirected payment.
 */
export function generateConfirmationCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(CODE_LENGTH, "0");
}

/**
 * HMAC of the code, salted with the account id so the same six digits
 * never produce the same hash for two different members. Reuses
 * APP_ENCRYPTION_KEY as key material, the same pattern already used by
 * unsubscribe-token.ts and the WhatsApp signature check.
 */
export function hashConfirmationCode(accountId: string, code: string): string {
  const key = process.env.APP_ENCRYPTION_KEY;
  if (!key) throw new Error("Missing APP_ENCRYPTION_KEY");
  return crypto.createHmac("sha256", key).update(`${accountId}:${code}`).digest("hex");
}

/** Constant-time comparison, so a wrong code cannot be narrowed down by timing. */
export function verifyConfirmationCode(accountId: string, code: string, storedHash: string): boolean {
  const expected = Buffer.from(hashConfirmationCode(accountId, code), "hex");
  const stored = Buffer.from(storedHash, "hex");
  if (expected.length !== stored.length) return false;
  return crypto.timingSafeEqual(expected, stored);
}

// ============================================================
// Sec 8: the invoice interception fraud notice
// ============================================================

export const BANK_NOTICE_STYLES = ["no_change", "phone_to_confirm", "none"] as const;
export type BankNoticeStyle = (typeof BANK_NOTICE_STYLES)[number];

/**
 * The line printed on the document, and above the PDF on the public link.
 *
 * `no_change` is the default rather than the phone version because it
 * defeats the same fraud without requiring the member to be reachable. An
 * informal trader under a sink cannot answer every call, and a notice that
 * generates calls he cannot take is a notice he will switch off. This
 * version works while he is unavailable, which is exactly when it is
 * needed.
 */
export function bankNoticeText(style: BankNoticeStyle, phone: string | null): string | null {
  switch (style) {
    case "no_change":
      return "Our banking details never change. If you receive a message asking you to pay into a different account, please do not pay it and contact us.";
    case "phone_to_confirm":
      return phone
        ? `Please phone us on ${phone} to confirm these banking details before making payment.`
        : // Falls back rather than printing a notice with a blank number in
          // it, which would read as carelessness on the member's own invoice.
          "Our banking details never change. If you receive a message asking you to pay into a different account, please do not pay it and contact us.";
    case "none":
      return null;
  }
}

/** Sec 8: shown once if a member switches the notice off, then logged and never repeated. */
export const BANK_NOTICE_OFF_WARNING =
  "Invoice fraud is common in South Africa. Without this notice, a customer who receives a fake invoice using your business name may pay a criminal instead of you. Are you sure?";
