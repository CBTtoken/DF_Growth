"use client";

import { useActionState, useState } from "react";
import { SA_PROVINCES } from "@/lib/bizup/schemas";
import type { CustomerFormState } from "@/app/bizup/customers/actions";

// 16px inputs, same reasoning as the other BizUp forms: iOS Safari zooms
// into anything smaller and this is a phone-first product.
const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-gray-700";

// The fields this form always renders. Anything rejected outside this set
// cannot show its own message, so the catch-all below covers it.
const VISIBLE_FIELDS = new Set(["name", "whatsapp", "phone", "email", "notes"]);

export interface CustomerDefaults {
  id?: string;
  name?: string | null;
  isBusiness?: boolean | null;
  registrationNumber?: string | null;
  vatNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  notes?: string | null;
}

function Field({
  name,
  label,
  defaultValue,
  errors,
  type = "text",
  optional = true,
  inputMode,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  errors?: string[];
  type?: string;
  optional?: boolean;
  inputMode?: "text" | "tel" | "numeric" | "email";
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
        placeholder={placeholder}
        className={inputClass}
      />
      {errors?.[0] && <span className="text-xs text-red-600">{errors[0]}</span>}
    </label>
  );
}

export function CustomerForm({
  action,
  defaults = {},
  submitLabel,
  next,
}: {
  action: (state: CustomerFormState, formData: FormData) => Promise<CustomerFormState>;
  defaults?: CustomerDefaults;
  submitLabel: string;
  next?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [isBusiness, setIsBusiness] = useState(!!defaults.isBusiness);
  const [showAddress, setShowAddress] = useState(
    // Opened by default when there is already an address to see, closed
    // otherwise. Sec 3.2 only makes an address mandatory over R5,000, and
    // most jobs never get there, so it should not be in the way.
    !!(defaults.addressLine1 || defaults.city || defaults.postalCode),
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      {next && <input type="hidden" name="next" value={next} />}

      <Field
        name="name"
        label={isBusiness ? "Business name" : "Customer name"}
        defaultValue={defaults.name}
        errors={state?.error?.name}
        optional={false}
        placeholder={isBusiness ? "Bergview Body Corporate" : "Mrs A van der Merwe"}
      />

      <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
        <input
          type="checkbox"
          name="isBusiness"
          checked={isBusiness}
          onChange={(e) => setIsBusiness(e.target.checked)}
          className="size-4"
        />
        This customer is a business
      </label>

      {/* Only shown for a business. Asking a plumber for a homeowner's
          company registration number is exactly the friction Sec 9's
          sixty-second target cannot afford. */}
      {isBusiness && (
        <>
          <Field
            name="registrationNumber"
            label="Company registration number"
            defaultValue={defaults.registrationNumber}
            errors={state?.error?.registrationNumber}
          />
          <label className={labelClass}>
            <span>
              Their VAT number <span className="font-normal text-gray-400">(optional)</span>
            </span>
            <input
              name="vatNumber"
              defaultValue={defaults.vatNumber ?? ""}
              inputMode="numeric"
              placeholder="4123456789"
              className={inputClass}
            />
            <span className="text-xs text-gray-500">
              Only needed if they are VAT registered and the invoice is over R5,000.
            </span>
            {state?.error?.vatNumber?.[0] && (
              <span className="text-xs text-red-600">{state.error.vatNumber[0]}</span>
            )}
          </label>
        </>
      )}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-sm font-semibold text-ink">How you reach them</legend>
        <Field
          name="whatsapp"
          label="WhatsApp number"
          type="tel"
          inputMode="tel"
          defaultValue={defaults.whatsapp}
          errors={state?.error?.whatsapp}
          placeholder="082 555 0134"
        />
        <Field
          name="phone"
          label="Phone"
          type="tel"
          inputMode="tel"
          defaultValue={defaults.phone}
          errors={state?.error?.phone}
        />
        <Field
          name="email"
          label="Email"
          type="email"
          inputMode="email"
          defaultValue={defaults.email}
          errors={state?.error?.email}
        />
      </fieldset>

      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setShowAddress((v) => !v)}
          className="self-start text-sm font-semibold text-brand underline-offset-2 hover:underline"
        >
          {showAddress ? "Hide address" : "Add an address"}
        </button>
        {!showAddress && (
          <p className="-mt-2 text-xs text-gray-500">
            SARS needs your customer&apos;s address on any invoice over R5,000. You can add it later.
          </p>
        )}

        {showAddress && (
          <>
            <Field name="addressLine1" label="Street address" defaultValue={defaults.addressLine1} />
            <Field name="addressLine2" label="Suburb" defaultValue={defaults.addressLine2} />
            <Field name="city" label="City or town" defaultValue={defaults.city} />
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
            <Field name="postalCode" label="Postal code" inputMode="numeric" defaultValue={defaults.postalCode} />
          </>
        )}
      </div>

      <label className={labelClass}>
        <span>
          Notes <span className="font-normal text-gray-400">(optional, only you see these)</span>
        </span>
        <textarea
          name="notes"
          defaultValue={defaults.notes ?? ""}
          rows={3}
          className={inputClass}
          placeholder="Gate code, dogs, best time to call"
        />
      </label>

      {state?.error?._form?.[0] && <p className="text-sm text-red-600">{state.error._form[0]}</p>}

      {/* Safety net for the failure Dewald hit: the action rejected fields
          that were not on screen, so nothing saved and nothing explained
          why. The underlying cause is fixed, but any future rejection of a
          field this form does not render would be invisible in exactly the
          same way. This makes that impossible: if there is an error and no
          visible field is showing one, say so plainly. */}
      {state?.error &&
        !state.error._form &&
        !Object.keys(state.error).some((k) => VISIBLE_FIELDS.has(k)) && (
          <p className="text-sm text-red-600">
            We couldn&apos;t save that, and the problem is not with anything shown here. Please try
            again, or get in touch if it keeps happening.
          </p>
        )}

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
