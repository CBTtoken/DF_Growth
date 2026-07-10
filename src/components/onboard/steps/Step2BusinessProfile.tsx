"use client";

import { useActionState, useEffect, useState } from "react";
import { saveStep2, type OnboardState } from "@/app/onboard/actions";

const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
];

const inputClass =
  "rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-gray-100 disabled:text-gray-400";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-gray-700";

export function Step2BusinessProfile({
  initialProvince,
  initialIndustry,
  initialBusinessAddress,
  initialBusinessDescription,
  initialTagline,
  initialProductsServices,
  initialAdditionalNotes,
  onSuccess,
}: {
  initialProvince: string;
  initialIndustry: string;
  initialBusinessAddress: string;
  initialBusinessDescription: string;
  initialTagline: string;
  initialProductsServices: string;
  initialAdditionalNotes: string;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState<OnboardState, FormData>(saveStep2, null);
  const [isOnline, setIsOnline] = useState(initialBusinessAddress === "Online");

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">Tell us about your business</h2>
        <p className="mt-1 text-sm text-gray-500">
          The more you give us here, the better we can build your page and your ad campaigns —
          we&apos;ll even draft your landing page copy from this.
        </p>
      </div>

      <label className={labelClass}>
        Province
        <select name="province" defaultValue={initialProvince} required className={inputClass}>
          <option value="" disabled>
            Select a province
          </option>
          {PROVINCES.map((province) => (
            <option key={province} value={province}>
              {province}
            </option>
          ))}
        </select>
      </label>
      {state?.error?.province && <p className="text-xs text-red-600">{state.error.province[0]}</p>}

      <label className={labelClass}>
        Industry
        <input
          type="text"
          name="industry"
          defaultValue={initialIndustry}
          required
          placeholder="e.g. Hair salon, plumbing, boutique gym"
          className={inputClass}
        />
      </label>
      {state?.error?.industry && <p className="text-xs text-red-600">{state.error.industry[0]}</p>}

      <div className="flex flex-col gap-1.5 text-sm">
        <label className={labelClass}>
          Business address
          <input
            type="text"
            name="businessAddress"
            defaultValue={isOnline ? "" : initialBusinessAddress}
            disabled={isOnline}
            required={!isOnline}
            placeholder="Street, suburb, city"
            className={inputClass}
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={isOnline}
            onChange={(e) => setIsOnline(e.target.checked)}
            className="accent-brand"
          />
          This is an online-only business, no physical address
        </label>
        {isOnline && <input type="hidden" name="businessAddress" value="Online" />}
      </div>
      {state?.error?.businessAddress && (
        <p className="text-xs text-red-600">{state.error.businessAddress[0]}</p>
      )}

      <label className={labelClass}>
        What does your business do?
        <textarea
          name="businessDescription"
          defaultValue={initialBusinessDescription}
          required
          maxLength={600}
          placeholder="In your own words — what do you do and who is it for?"
          className={inputClass}
          rows={3}
        />
      </label>
      {state?.error?.businessDescription && (
        <p className="text-xs text-red-600">{state.error.businessDescription[0]}</p>
      )}

      <label className={labelClass}>
        Tagline <span className="font-normal text-gray-400">(optional)</span>
        <input
          type="text"
          name="tagline"
          defaultValue={initialTagline}
          maxLength={80}
          placeholder="A short slogan, if you have one"
          className={inputClass}
        />
      </label>
      {state?.error?.tagline && <p className="text-xs text-red-600">{state.error.tagline[0]}</p>}

      <label className={labelClass}>
        Main products or services <span className="font-normal text-gray-400">(optional)</span>
        <textarea
          name="productsServices"
          defaultValue={initialProductsServices}
          maxLength={600}
          placeholder="Leave blank if you don't have a fixed list — e.g. you just want people to get in touch"
          className={inputClass}
          rows={3}
        />
      </label>
      {state?.error?.productsServices && (
        <p className="text-xs text-red-600">{state.error.productsServices[0]}</p>
      )}

      <label className={labelClass}>
        Anything else worth knowing? <span className="font-normal text-gray-400">(optional)</span>
        <textarea
          name="additionalNotes"
          defaultValue={initialAdditionalNotes}
          maxLength={600}
          placeholder="Your story, what makes you stand out, anything you'd tell a new customer"
          className={inputClass}
          rows={2}
        />
      </label>
      {state?.error?.additionalNotes && (
        <p className="text-xs text-red-600">{state.error.additionalNotes[0]}</p>
      )}
      {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {pending ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}
