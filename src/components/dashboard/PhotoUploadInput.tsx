"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadClientPhoto } from "@/app/dashboard/actions";

// Real production crash found during Dewald's Foundation onboarding test:
// selecting multiple real phone photos at once (often 3-5MB each) blew
// straight past the Server Action body-size limit (next.config.ts, only
// ever sized for a single logo upload) — the whole multipart request got
// rejected before uploadClientPhoto ever ran, surfacing as a generic
// "This page couldn't load" crash, the same failure class as the earlier
// logo-upload bug. Fix here is structural, not a bigger number: upload one
// file per request instead of bundling every selected file into a single
// submission. This removes the total-batch-size ceiling entirely — there's
// no way to know in advance how many real photos, or how large, a client
// will select at once, so any fixed combined-request cap will eventually
// be hit again by a large enough selection.
//
// Calls the Server Action directly rather than through a <form>/
// useActionState dispatch (which is what let uploadClientPhoto batch
// everything into one request before), so router.refresh() is needed
// afterward to pick up each upload's revalidatePath — that happens
// automatically for a real form submission, not for a direct call.
export function PhotoUploadInput({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList) {
    setPending(true);
    setError(null);
    let failedCount = 0;

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("photo", file);
      const result = await uploadClientPhoto(null, formData);
      if (result?.error) failedCount++;
    }

    if (failedCount > 0) {
      setError(
        `${failedCount} photo${failedCount > 1 ? "s" : ""} couldn't be uploaded — try a smaller file or a different format.`
      );
    }
    router.refresh();
    setPending(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <input
          type="file"
          name="photo"
          accept="image/png,image/jpeg,image/webp"
          multiple
          disabled={disabled || pending}
          className="text-sm text-gray-600 file:mr-3 file:rounded-full file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200 disabled:opacity-50"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFiles(e.target.files);
            }
            // Lets choosing the exact same file(s) again re-trigger onChange
            // (browsers don't fire it for an unchanged selection otherwise).
            e.target.value = "";
          }}
        />
        {pending && <span className="text-xs text-gray-400">Uploading...</span>}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
