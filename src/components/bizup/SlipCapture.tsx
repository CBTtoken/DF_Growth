"use client";

import { useRef, useState, useTransition } from "react";
import type { SlipActionState } from "@/app/bizup/slips/actions";

// The capture button (HANDOFF-slip-management.md step 1). One big obvious
// control: `capture="environment"` makes a phone open the camera directly
// rather than a file browser, which is the whole gesture this feature is
// built around.
//
// Compression happens here, client-side, before upload. A slip photo does
// not need 4MB: it is resized to at most 1600px on its long edge and
// re-encoded as JPEG, which lands well under 1MB and still reads clearly
// for both the OCR and the accountant. If the browser cannot decode the
// image (rare), the original file goes up instead and the 5MB storage
// ceiling has the final say.

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

async function compress(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

export function SlipCapture({
  action,
}: {
  action: (formData: FormData) => Promise<SlipActionState>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so choosing the same file twice still fires onChange.
    event.target.value = "";
    if (!file) return;

    setError(null);
    const blob = await compress(file);
    const formData = new FormData();
    formData.append("image", blob, "slip.jpg");

    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onChange}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-brand px-6 py-7 text-lg font-bold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-70"
      >
        <span aria-hidden className="text-2xl leading-none">📷</span>
        {pending ? "Reading your slip..." : "Photograph a slip"}
      </button>
      <p className="text-center text-xs text-gray-500">
        {pending
          ? "Saving the photo and reading the numbers. A few seconds."
          : "Opens your camera. You check every number before it counts."}
      </p>
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>
      )}
    </div>
  );
}
