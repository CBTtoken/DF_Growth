"use client";

import { useActionState } from "react";
import { saveDomainVerification } from "@/app/dashboard/actions";

export function DomainVerificationForm({
  initialGoogle,
  initialFacebook,
}: {
  initialGoogle: string;
  initialFacebook: string;
}) {
  const [state, formAction, pending] = useActionState(saveDomainVerification, null);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700">Domain verification</h3>
        <p className="text-xs text-gray-500">
          Verifying your page with Google Search Console or Meta Business? Paste the code here, we&apos;ll add it to
          your page automatically.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Google site verification code
        <input
          type="text"
          name="googleSiteVerification"
          defaultValue={initialGoogle}
          placeholder="e.g. abc123XYZ..."
          className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <span className="font-normal text-gray-400">
          Search Console → Settings → Ownership verification → HTML tag → just the content value, not the whole tag
        </span>
      </label>
      {state?.error?.googleSiteVerification && (
        <p className="text-xs text-red-600">{state.error.googleSiteVerification[0]}</p>
      )}

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Meta domain verification code
        <input
          type="text"
          name="facebookDomainVerification"
          defaultValue={initialFacebook}
          placeholder="e.g. abc123xyz..."
          className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <span className="font-normal text-gray-400">
          Meta Business Settings → Brand Safety → Domains → Add → Meta tag verification → just the content value
        </span>
      </label>
      {state?.error?.facebookDomainVerification && (
        <p className="text-xs text-red-600">{state.error.facebookDomainVerification[0]}</p>
      )}
      {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}
      {state?.success && <p className="text-xs font-medium text-green-600">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
