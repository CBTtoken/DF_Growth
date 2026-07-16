"use client";

import { useState } from "react";

// List Your Event Sec 3: "a few images." Deliberately not a port of the
// dashboard's PhotoUploadInput — that component uploads on every file
// selection via a Server Action gated on an already-valid session
// (requireGrowthClientId()), which doesn't exist yet for a visitor who
// hasn't signed up or logged in at the point they're picking photos. Files
// just sit in this <input>'s own FileList until the whole form (name,
// date, contact details, files, everything) submits together in one
// request — src/lib/events/actions.ts uploads them then, once an
// organizer_account_id actually exists.
export function EventPhotoUpload() {
  const [previews, setPreviews] = useState<string[]>([]);
  const [count, setCount] = useState(0);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 5);
    setPreviews((old) => {
      old.forEach((url) => URL.revokeObjectURL(url));
      return files.map((f) => URL.createObjectURL(f));
    });
    setCount(files.length);
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">Photos (optional, up to 5)</label>
      <input
        type="file"
        name="images"
        multiple
        accept="image/png,image/jpeg,image/webp"
        onChange={handleChange}
        className="cursor-pointer rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500 file:mr-3 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:border-gray-400"
      />
      {previews.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {previews.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- transient client-side blob: preview, never a real asset URL next/image could optimize.
            <img key={i} src={src} alt="" className="aspect-square w-full rounded-lg border border-gray-100 object-cover" />
          ))}
        </div>
      )}
      {count === 5 && <p className="text-xs text-gray-400">Maximum 5 photos — extra ones you picked were dropped.</p>}
    </div>
  );
}
