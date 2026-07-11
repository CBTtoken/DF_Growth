"use client";

import { useActionState, useRef } from "react";
import Image from "next/image";
import { uploadClientPhoto, deleteClientPhoto } from "@/app/dashboard/actions";

type Photo = { id: string; storage_path: string };

export function PhotoGallery({ photos, storageBase }: { photos: Photo[]; storageBase: string }) {
  const [uploadState, uploadAction, uploadPending] = useActionState(uploadClientPhoto, null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink">Your photos</h2>
        <p className="mt-1 text-sm text-gray-500">
          Up to 10 real photos of your business, used in templates that showcase real imagery. Your
          first photo is the one shown first.
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
          disabled={uploadPending || photos.length >= 10}
          className="text-sm text-gray-600 file:mr-3 file:rounded-full file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200 disabled:opacity-50"
          onChange={(e) => {
            if (e.target.files?.[0]) formRef.current?.requestSubmit();
          }}
        />
        {uploadPending && <span className="text-xs text-gray-400">Uploading...</span>}
      </form>
      {uploadState?.error?._form && <p className="text-xs text-red-600">{uploadState.error._form[0]}</p>}
      {photos.length >= 10 && <p className="text-xs text-gray-400">Photo limit reached, delete one to add another.</p>}

      {photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {photos.map((photo, i) => (
            <DeletablePhoto key={photo.id} photo={photo} isPrimary={i === 0} storageBase={storageBase} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No photos yet, PNG, JPG, or WebP, under 5MB each.</p>
      )}
    </section>
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
        sizes="150px"
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
