"use client";

import Image from "next/image";
import { useActionState } from "react";
import { updateBizUpLogo } from "@/app/bizup/actions";

// "Your own logo" is sold in the R49 tier and on the landing page. A free
// member sees the section and what it would give them, rather than it being
// hidden, so the upgrade has a reason attached to it instead of being an
// abstract price difference.
export function LogoUpload({
  logoUrl,
  allowed,
}: {
  logoUrl: string | null;
  /** capabilitiesFor(plan).ownLogo. The server re-checks; this only affects what is shown. */
  allowed: boolean;
}) {
  const [state, action, pending] = useActionState(updateBizUpLogo, null);

  if (!allowed) {
    return (
      <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
        Your own logo comes with the R49 plan. Until then your documents carry your business name,
        address and banking details, which is everything they legally need.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      {logoUrl && (
        <div className="flex items-center gap-4">
          {/* Unoptimized: the file lives in Supabase storage, and routing it
              through the image optimizer would need that host allow-listed
              in next.config for a logo that is already small by policy. */}
          <Image
            src={logoUrl}
            alt="Your logo"
            width={160}
            height={64}
            unoptimized
            className="h-12 w-auto"
          />
          <button
            type="submit"
            name="remove"
            value="true"
            className="text-sm font-semibold text-red-600 underline-offset-2 hover:underline"
          >
            Remove
          </button>
        </div>
      )}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
        {logoUrl ? "Replace it" : "Upload your logo"}
        <input
          type="file"
          name="logo"
          accept="image/png,image/jpeg,image/webp"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 file:mr-3 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
        />
      </label>
      <p className="text-xs text-gray-500">
        PNG, JPG or WEBP, up to 2MB. A wide logo with a transparent or white background works best.
        It appears on documents you send from now on. Anything you have already sent is unchanged.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save logo"}
      </button>

      {state?.error?._form?.[0] && <p className="text-sm text-red-600">{state.error._form[0]}</p>}
      {state?.ok && <p className="text-sm font-medium text-green-700">{state.ok}</p>}
    </form>
  );
}
