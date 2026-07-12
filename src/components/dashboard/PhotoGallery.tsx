"use client";

import { useActionState } from "react";
import Image from "next/image";
import { deleteClientPhoto, setHeroPhoto } from "@/app/dashboard/actions";
import { PexelsPicker } from "@/components/dashboard/PexelsPicker";
import { PhotoUploadInput } from "@/components/dashboard/PhotoUploadInput";

type Photo = { id: string; storage_path: string };

// Combined spec Sec 7: heroPhotoId is the client's own explicit choice
// (growth_clients.hero_photo_id), not upload order — uploading a photo here
// no longer implies it becomes the page's hero background.
export function PhotoGallery({
  photos,
  storageBase,
  heroPhotoId,
  industryHint,
}: {
  photos: Photo[];
  storageBase: string;
  heroPhotoId: string | null;
  // Combined spec Sec 24: pre-fills the Pexels search with the client's
  // own industry, so the first search they see is already relevant.
  industryHint?: string;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink">Your photos</h2>
        <p className="mt-1 text-sm text-gray-500">
          Up to 10 real photos of your business, used in templates that showcase real imagery. Pick
          one as your hero image below if your page style shows one, otherwise skip it.
        </p>
      </div>

      <PhotoUploadInput disabled={photos.length >= 10} />
      {photos.length >= 10 && <p className="text-xs text-gray-400">Photo limit reached, delete one to add another.</p>}

      <PexelsPicker industryHint={industryHint} disabled={photos.length >= 10} />

      {photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {photos.map((photo) => (
            <GalleryPhoto
              key={photo.id}
              photo={photo}
              isHero={photo.id === heroPhotoId}
              storageBase={storageBase}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No photos yet, PNG, JPG, or WebP, under 5MB each.</p>
      )}
    </section>
  );
}

function GalleryPhoto({ photo, isHero, storageBase }: { photo: Photo; isHero: boolean; storageBase: string }) {
  const [deleteState, deleteAction, deletePending] = useActionState(deleteClientPhoto, null);
  const [heroState, heroAction, heroPending] = useActionState(setHeroPhoto, null);

  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl border border-gray-100">
      <Image
        src={`${storageBase}/${photo.storage_path}`}
        alt="Business photo"
        fill
        sizes="150px"
        className="object-cover"
      />
      {isHero && (
        <span className="absolute left-1.5 top-1.5 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">
          Hero image
        </span>
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
        <form action={heroAction}>
          <input type="hidden" name="photoId" value={isHero ? "" : photo.id} />
          <button
            type="submit"
            disabled={heroPending}
            className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-ink disabled:opacity-50"
          >
            {heroPending ? "Saving..." : isHero ? "Unset hero image" : "Use as hero image"}
          </button>
        </form>
        <form action={deleteAction}>
          <input type="hidden" name="photoId" value={photo.id} />
          <button
            type="submit"
            disabled={deletePending}
            className="text-[10px] font-semibold text-white underline-offset-2 hover:underline disabled:opacity-50"
          >
            {deletePending ? "Removing..." : "Remove"}
          </button>
        </form>
      </div>
      {(deleteState?.error?._form || heroState?.error?._form) && (
        <span className="absolute bottom-1 left-1 right-1 rounded bg-red-600/90 px-1.5 py-1 text-[10px] text-white">
          {deleteState?.error?._form?.[0] ?? heroState?.error?._form?.[0]}
        </span>
      )}
    </div>
  );
}
