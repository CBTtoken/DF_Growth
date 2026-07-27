"use client";

import { useActionState, useState } from "react";
import {
  requestBankChange,
  confirmBankChange,
  cancelBankChange,
  updateBankNoticeStyle,
} from "@/app/bizup/bank-actions";
import {
  SA_BANKS,
  CODE_TTL_MINUTES,
  BANK_NOTICE_OFF_WARNING,
  bankNoticeText,
  type BankNoticeStyle,
} from "@/lib/bizup/bank";

// 16px inputs, same reasoning as BusinessProfileForm: iOS Safari zooms
// into anything smaller, and this is a phone-first product.
const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-gray-700";
const buttonClass =
  "inline-flex items-center justify-center rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-50";

export interface BankSummary {
  masked: string | null;
  bankName: string | null;
  accountHolder: string | null;
  branchCode: string | null;
  accountType: string | null;
  lastConfirmedAt: string | null;
  pendingLast4: string | null;
  pendingBankName: string | null;
}

export function BankDetailsSection({ summary }: { summary: BankSummary }) {
  const [requestState, requestAction, requesting] = useActionState(requestBankChange, null);
  const [confirmState, confirmAction, confirming] = useActionState(confirmBankChange, null);
  const [branchCode, setBranchCode] = useState("");

  // A request is outstanding either because one was already open when the
  // page loaded, or because this session just started one.
  const pendingLast4 = requestState?.pendingLast4 ?? summary.pendingLast4;
  const awaitingCode = !!pendingLast4 && !confirmState?.done;

  if (awaitingCode) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Check your email for a code</p>
          <p className="mt-1 text-sm text-amber-800">
            We sent a {CODE_TTL_MINUTES}-minute code to confirm the change to the account ending{" "}
            <strong>{pendingLast4}</strong>. Your banking details have not changed yet, and they
            will not change until the code is entered.
          </p>
        </div>

        <form action={confirmAction} className="flex flex-col gap-3">
          <label className={labelClass}>
            <span>Enter the 6-digit code</span>
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              placeholder="123456"
              className={`${inputClass} text-center tracking-[0.4em]`}
            />
            {confirmState?.error?.code?.[0] && (
              <span className="text-xs text-red-600">{confirmState.error.code[0]}</span>
            )}
          </label>
          {confirmState?.error?._form?.[0] && (
            <p className="text-sm text-red-600">{confirmState.error._form[0]}</p>
          )}
          <button type="submit" disabled={confirming} className={buttonClass}>
            {confirming ? "Checking..." : "Confirm the change"}
          </button>
        </form>

        <form action={cancelBankChange}>
          <button
            type="submit"
            className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-brand hover:underline"
          >
            Cancel this change
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {summary.masked ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm">
          <p className="font-semibold text-ink">These details print on your invoices</p>
          <p className="mt-2 text-gray-700">{summary.accountHolder}</p>
          <p className="text-gray-700">
            {summary.bankName}, {summary.accountType}
          </p>
          {/* Only ever the last four digits. The full number is decrypted in
              one place, when a document is generated, and nowhere else. */}
          <p className="text-gray-700">Account {summary.masked}</p>
          <p className="text-gray-700">Branch {summary.branchCode}</p>
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          No banking details yet. Your customers need these to pay you.
        </p>
      )}

      {confirmState?.done && (
        <p className="text-sm font-medium text-green-700">
          Your banking details have been updated.
        </p>
      )}

      <form action={requestAction} className="flex flex-col gap-4">
        <p className="text-sm font-semibold text-ink">
          {summary.masked ? "Change these details" : "Add your banking details"}
        </p>

        <label className={labelClass}>
          <span>Bank</span>
          <select
            name="bankName"
            defaultValue={summary.bankName ?? ""}
            onChange={(e) => {
              // Prefills the universal branch code as a convenience. The
              // field below stays editable, since a member on a branch that
              // does not use the universal code has to be able to override it.
              const match = SA_BANKS.find((b) => b.name === e.target.value);
              if (match) setBranchCode(match.branchCode);
            }}
            className={inputClass}
          >
            <option value="">Choose your bank</option>
            {SA_BANKS.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
          {requestState?.error?.bankName?.[0] && (
            <span className="text-xs text-red-600">{requestState.error.bankName[0]}</span>
          )}
        </label>

        <label className={labelClass}>
          <span>Name on the account</span>
          <input
            name="accountHolder"
            defaultValue={summary.accountHolder ?? ""}
            className={inputClass}
            placeholder="S Ndlovu"
          />
          {requestState?.error?.accountHolder?.[0] && (
            <span className="text-xs text-red-600">{requestState.error.accountHolder[0]}</span>
          )}
        </label>

        <label className={labelClass}>
          <span>Account number</span>
          <input
            name="accountNumber"
            inputMode="numeric"
            autoComplete="off"
            className={inputClass}
            placeholder="62012345678"
          />
          {requestState?.error?.accountNumber?.[0] && (
            <span className="text-xs text-red-600">{requestState.error.accountNumber[0]}</span>
          )}
        </label>

        <label className={labelClass}>
          <span>Branch code</span>
          <input
            name="branchCode"
            inputMode="numeric"
            value={branchCode}
            onChange={(e) => setBranchCode(e.target.value)}
            className={inputClass}
            placeholder="250655"
          />
          {requestState?.error?.branchCode?.[0] && (
            <span className="text-xs text-red-600">{requestState.error.branchCode[0]}</span>
          )}
        </label>

        <label className={labelClass}>
          <span>Account type</span>
          <select name="accountType" defaultValue={summary.accountType ?? "cheque"} className={inputClass}>
            <option value="cheque">Cheque</option>
            <option value="savings">Savings</option>
          </select>
        </label>

        <p className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
          For your protection, we will email you a code before any change takes effect. Your account
          number is encrypted, and only the last four digits are ever shown back to you.
        </p>

        {requestState?.error?._form?.[0] && (
          <p className="text-sm text-red-600">{requestState.error._form[0]}</p>
        )}

        <button type="submit" disabled={requesting} className={buttonClass}>
          {requesting ? "Sending code..." : summary.masked ? "Send me a code to change this" : "Send me a code to save this"}
        </button>
      </form>
    </div>
  );
}

export function BankNoticeSection({
  current,
  phone,
  alreadyAcknowledged,
}: {
  current: BankNoticeStyle;
  phone: string | null;
  alreadyAcknowledged: boolean;
}) {
  const [state, action, pending] = useActionState(updateBankNoticeStyle, null);
  const [selected, setSelected] = useState<BankNoticeStyle>(current);

  // Sec 8: shown once when a member switches the notice off, then logged
  // and never raised again.
  const showOffWarning = selected === "none" && current !== "none" && !alreadyAcknowledged;
  const preview = bankNoticeText(selected, phone);

  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">
        Fake invoices with swapped banking details are common in South Africa. This line on your
        invoice tells your customer what to do about it.
      </p>

      {(
        [
          ["no_change", "Warn my customers that my details never change"],
          ["phone_to_confirm", "Ask my customers to phone me first"],
          ["none", "Print nothing"],
        ] as [BankNoticeStyle, string][]
      ).map(([value, label]) => (
        <label key={value} className="flex items-start gap-3 text-sm text-gray-700">
          <input
            type="radio"
            name="bankNoticeStyle"
            value={value}
            checked={selected === value}
            onChange={() => setSelected(value)}
            className="mt-1"
          />
          <span>{label}</span>
        </label>
      ))}

      {preview ? (
        <p className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs italic text-gray-600">
          Your invoice will say: &ldquo;{preview}&rdquo;
        </p>
      ) : (
        <p className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-500">
          Nothing will be printed.
        </p>
      )}

      {selected === "phone_to_confirm" && !phone && (
        <p className="text-xs text-amber-700">
          You have no phone number saved, so we will print the &ldquo;details never change&rdquo;
          wording instead of an invoice with a blank number on it. Add a phone number in your
          business details to use this option.
        </p>
      )}

      {showOffWarning && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {BANK_NOTICE_OFF_WARNING}
        </p>
      )}

      {state?.done && <p className="text-sm font-medium text-green-700">Saved.</p>}
      {state?.error?._form?.[0] && <p className="text-sm text-red-600">{state.error._form[0]}</p>}

      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Saving..." : showOffWarning ? "Yes, print nothing" : "Save"}
      </button>
    </form>
  );
}
