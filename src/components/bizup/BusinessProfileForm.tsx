"use client";

import { useActionState, useState } from "react";
import { MONTHS, SA_PROVINCES } from "@/lib/bizup/schemas";
import { isValidVatNumberFormat, VAT_NUMBER_HELP, VAT_ACTIVATION_CONFIRMATION } from "@/lib/bizup/vat";
import type { BizUpFormState } from "@/app/bizup/actions";

export interface BusinessProfileDefaults {
  businessName?: string | null;
  tradingName?: string | null;
  registrationNumber?: string | null;
  vatNumber?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  financialYearEndMonth?: number | null;
}

// Inputs are 16px (text-base), not the 14px used elsewhere in this app.
// iOS Safari auto-zooms into any input under 16px, which on a form this
// long means the member is pinching back out after every field. BizUp's
// whole target is one-handed use on a phone, so this is deliberate rather
// than inconsistent.
const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-gray-700";

function Field({
  name,
  label,
  defaultValue,
  errors,
  type = "text",
  optional = false,
  inputMode,
  autoComplete,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  errors?: string[];
  type?: string;
  optional?: boolean;
  inputMode?: "text" | "tel" | "numeric" | "email";
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className={labelClass}>
      <span>
        {label} {optional && <span className="font-normal text-gray-400">(optional)</span>}
      </span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ""}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={inputClass}
      />
      {errors?.[0] && <span className="text-xs text-red-600">{errors[0]}</span>}
    </label>
  );
}

export function BusinessProfileForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (state: BizUpFormState, formData: FormData) => Promise<BizUpFormState>;
  defaults: BusinessProfileDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [vatNumber, setVatNumber] = useState(defaults.vatNumber ?? "");
  const [saved, setSaved] = useState(false);

  const alreadyAVendor = !!defaults.vatNumber;
  // Sec 3.4: the confirmation shown when a member adds a VAT number for the
  // first time, so nobody switches their business onto 15% VAT by typing
  // into a field they misread.
  const showVatActivation = !alreadyAVendor && isValidVatNumberFormat(vatNumber);

  return (
    <form
      action={async (formData) => {
        const result = await formAction(formData);
        setSaved(result === null);
        return result;
      }}
      className="flex flex-col gap-5"
    >
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-sm font-semibold text-ink">Your business</legend>
        <Field
          name="businessName"
          label="Business name"
          defaultValue={defaults.businessName}
          errors={state?.error?.businessName}
          autoComplete="organization"
          placeholder="Sipho's Plumbing"
        />
        <Field
          name="tradingName"
          label="Trading as"
          defaultValue={defaults.tradingName}
          errors={state?.error?.tradingName}
          optional
        />
        <Field
          name="registrationNumber"
          label="Company registration number"
          defaultValue={defaults.registrationNumber}
          errors={state?.error?.registrationNumber}
          optional
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-sm font-semibold text-ink">VAT</legend>
        <label className={labelClass}>
          <span>
            VAT number <span className="font-normal text-gray-400">(only if you are registered)</span>
          </span>
          <input
            type="text"
            name="vatNumber"
            value={vatNumber}
            onChange={(e) => setVatNumber(e.target.value)}
            inputMode="numeric"
            placeholder="4123456789"
            className={inputClass}
          />
          <span className="text-xs text-gray-500">{VAT_NUMBER_HELP}</span>
          {state?.error?.vatNumber?.[0] && (
            <span className="text-xs text-red-600">{state.error.vatNumber[0]}</span>
          )}
        </label>

        {showVatActivation && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {VAT_ACTIVATION_CONFIRMATION}
          </p>
        )}

        {/* Sec 3.5(b). Deliberately labelled as a reports-only setting: it
            has nothing to do with the rolling twelve-month VAT threshold
            tracker, and members who assume otherwise will read their own
            numbers wrong. */}
        <label className={labelClass}>
          <span>My financial year ends in</span>
          <select
            name="financialYearEndMonth"
            defaultValue={String(defaults.financialYearEndMonth ?? 2)}
            className={inputClass}
          >
            {MONTHS.map((month, i) => (
              <option key={month} value={i + 1}>
                {month}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500">
            Only used to group your reports. Most small businesses end in February.
          </span>
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-sm font-semibold text-ink">Address</legend>
        <p className="-mt-1 text-xs text-gray-500">
          This prints on your invoices. SARS needs it on any invoice over R5,000.
        </p>
        <Field
          name="addressLine1"
          label="Street address"
          defaultValue={defaults.addressLine1}
          errors={state?.error?.addressLine1}
          autoComplete="address-line1"
          optional
        />
        <Field
          name="addressLine2"
          label="Suburb"
          defaultValue={defaults.addressLine2}
          errors={state?.error?.addressLine2}
          autoComplete="address-line2"
          optional
        />
        <Field
          name="city"
          label="City or town"
          defaultValue={defaults.city}
          errors={state?.error?.city}
          autoComplete="address-level2"
          optional
        />
        <label className={labelClass}>
          <span>
            Province <span className="font-normal text-gray-400">(optional)</span>
          </span>
          <select name="province" defaultValue={defaults.province ?? ""} className={inputClass}>
            <option value="">Choose a province</option>
            {SA_PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <Field
          name="postalCode"
          label="Postal code"
          defaultValue={defaults.postalCode}
          errors={state?.error?.postalCode}
          inputMode="numeric"
          autoComplete="postal-code"
          optional
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-sm font-semibold text-ink">How customers reach you</legend>
        <Field
          name="email"
          label="Email"
          type="email"
          defaultValue={defaults.email}
          errors={state?.error?.email}
          inputMode="email"
          autoComplete="email"
        />
        <Field
          name="phone"
          label="Phone"
          type="tel"
          defaultValue={defaults.phone}
          errors={state?.error?.phone}
          inputMode="tel"
          autoComplete="tel"
          optional
        />
        <Field
          name="whatsapp"
          label="WhatsApp number"
          type="tel"
          defaultValue={defaults.whatsapp}
          errors={state?.error?.whatsapp}
          inputMode="tel"
          optional
          placeholder="Leave blank to use your phone number"
        />
      </fieldset>

      {state?.error?._form?.[0] && <p className="text-sm text-red-600">{state.error._form[0]}</p>}
      {saved && !state?.error && <p className="text-sm font-medium text-green-700">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
