"use client";

import { useActionState } from "react";
import Image from "next/image";
import { deleteClientPhoto, setHeroPhoto } from "@/app/dashboard/actions";
import { PexelsPicker } from "@/components/dashboard/PexelsPicker";
import { PhotoUploadInput } from "@/components/dashboard/PhotoUploadInput";
import { Card } from "@/components/ui/Card";
import { PHOTO_CAP } from "@/lib/photos";

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
    <Card className="flex flex-col gap-4">
      <div id="photos" className="scroll-mt-20">
        <h2 className="text-lg font-bold tracking-tight text-ink">Your photos</h2>
        <p className="mt-1 text-sm text-gray-500">
          Up to {PHOTO_CAP} real photos of your business. Five or more is where a page starts
          looking properly filled in. Tap <span className="font-semibold text-ink">Front page</span>{" "}
          on the one you want across the top, and change it whenever you like.
        </p>
        {/* Dewald, 8 August 2026: "should we tell them what the best size
            is?" Written as advice a person can act on with a phone in their
            hand, not as pixel dimensions they would have to go and measure.
            Every upload is resized to 1600px and straightened for them
            anyway (lib/photos-server.ts), so the only thing that genuinely
            helps is shape and light. */}
        <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-500">
          <span className="font-semibold text-gray-700">Taking photos?</span> Hold your phone
          sideways for the front page photo, so it fills the space properly. Shoot in daylight,
          get close to the work, and do not worry about size or which way up it is, we sort that
          out for you.
        </p>
      </div>

      <PhotoUploadInput disabled={photos.length >= PHOTO_CAP} />
      {photos.length >= PHOTO_CAP && (
        <p className="text-xs text-gray-400">Photo limit reached, delete one to add another.</p>
      )}

      <PexelsPicker industryHint={industryHint} disabled={photos.length >= PHOTO_CAP} />

      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
    </Card>
  );
}

function GalleryPhoto({ photo, isHero, storageBase }: { photo: Photo; isHero: boolean; storageBase: string }) {
  const [deleteState, deleteAction, deletePending] = useActionState(deleteClientPhoto, null);
  const [heroState, heroAction, heroPending] = useActionState(setHeroPhoto, null);

  // Dewald, 8 August 2026, testing on a phone: "nowhere does it give me the
  // option to select my front page photo." It did, behind
  // opacity-0 group-hover:opacity-100. A phone has no hover, so on the
  // device most members use, the hero control and the delete button were
  // invisible and unreachable. This is the same discoverability gap the
  // sprint set out to close, fixed in the wizard first and missed here.
  //
  // Controls now sit under the image, always visible, at a real tap size.
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border-2 ${
        isHero ? "border-brand" : "border-gray-100"
      }`}
    >
      <div className="relative aspect-square">
        <Image
          src={`${storageBase}/${photo.storage_path}`}
          alt="Business photo"
          fill
          sizes="(min-width: 640px) 160px, 45vw"
          className="object-cover"
        />
        {isHero && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">
            Front page
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-1 bg-white px-1.5 py-1.5">
        <form action={heroAction}>
          <input type="hidden" name="photoId" value={isHero ? "" : photo.id} />
          <button
            type="submit"
            disabled={heroPending}
            className={`rounded-full px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-50 ${
              isHero ? "text-gray-500 hover:text-gray-700" : "bg-brand/10 text-brand hover:bg-brand/20"
            }`}
          >
            {heroPending ? "Saving..." : isHero ? "Unset" : "Front page"}
          </button>
        </form>
        <form action={deleteAction}>
          <input type="hidden" name="photoId" value={photo.id} />
          <button
            type="submit"
            disabled={deletePending}
            className="px-2 py-1.5 text-[11px] font-semibold text-gray-400 underline-offset-2 hover:text-red-600 hover:underline disabled:opacity-50"
          >
            {deletePending ? "Removing..." : "Remove"}
          </button>
        </form>
      </div>
      {(deleteState?.error?._form || heroState?.error?._form) && (
        <span className="bg-red-600/90 px-1.5 py-1 text-[10px] text-white">
          {deleteState?.error?._form?.[0] ?? heroState?.error?._form?.[0]}
        </span>
      )}
    </div>
  );
}
