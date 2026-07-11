"use client";

import { useActionState, useRef } from "react";
import Image from "next/image";
import { uploadClientPhoto, deleteClientPhoto } from "@/app/dashboard/actions";

type Photo = { id: string; storage_path: string };

// Sprint 1, Build Item 11: photo upload used to only exist in the dashboard,
// after signup — a client's page could go fully live on stock imagery with
// no second visit ever prompting them to add real photos. Reuses the exact
// same multi-file upload/delete Server Actions the dashboard already uses
// (uploadClientPhoto requires an authenticated session, which the wizard
// already has), no new upload code needed. Skippable like the rest of this
// low-friction wizard — a client who skips still gets the stock-photo
// fallback, same as today, just now with the chance to add real ones first.
export function Step4PhotoUpload({
  initialPhotos,
  storageBase,
  onSuccess,
}: {
  initialPhotos: Photo[];
  storageBase: string;
  onSuccess: () => void;
}) {
  const [uploadState, uploadAction, uploadPending] = useActionState(uploadClientPhoto, null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">Add your photos</h2>
        <p className="mt-1 text-sm text-gray-500">
          Real photos of your business help customers trust you faster. Optional — skip this and
          we&apos;ll use a relevant stock photo until you add your own.
        </p>
      </div>

      <form
        ref={formRef}
        action={(formData) => {
          uploadAction(formData);
          formRef.current?.reset();
        }}
        className="flex items-center gap-3"
      >
        <input
          type="file"
          name="photo"
          accept="image/png,image/jpeg,image/webp"
          multiple
          disabled={uploadPending || initialPhotos.length >= 10}
          className="text-sm text-gray-600 file:mr-3 file:rounded-full file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200 disabled:opacity-50"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) formRef.current?.requestSubmit();
          }}
        />
        {uploadPending && <span className="text-xs text-gray-400">Uploading...</span>}
      </form>
      {uploadState?.error?._form && <p className="text-xs text-red-600">{uploadState.error._form[0]}</p>}

      {initialPhotos.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {initialPhotos.map((photo, i) => (
            <DeletablePhoto key={photo.id} photo={photo} isPrimary={i === 0} storageBase={storageBase} />
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={onSuccess}
          className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark"
        >
          Continue
        </button>
        {initialPhotos.length === 0 && (
          <button type="button" onClick={onSuccess} className="text-sm font-semibold text-gray-500 hover:text-gray-700">
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}

function DeletablePhoto({ photo, isPrimary, storageBase }: { photo: Photo; isPrimary: boolean; storageBase: string }) {
  const [state, action, pending] = useActionState(deleteClientPhoto, null);

  return (
    <form action={action} className="group relative aspect-square overflow-hidden rounded-xl border border-gray-100">
      <input type="hidden" name="photoId" value={photo.id} />
      <Image
        src={`${storageBase}/${photo.storage_path}`}
        alt="Business photo"
        fill
        sizes="120px"
        className="object-cover"
      />
      {isPrimary && (
        <span className="absolute left-1.5 top-1.5 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">
          Primary
        </span>
      )}
      <button
        type="submit"
        disabled={pending}
        className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-100"
      >
        {pending ? "Removing..." : "Remove"}
      </button>
      {state?.error?._form && (
        <span className="absolute bottom-1 left-1 right-1 rounded bg-red-600/90 px-1.5 py-1 text-[10px] text-white">
          {state.error._form[0]}
        </span>
      )}
    </form>
  );
}
