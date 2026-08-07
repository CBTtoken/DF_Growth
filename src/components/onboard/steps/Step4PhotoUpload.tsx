"use client";

import { useActionState } from "react";
import Image from "next/image";
import { deleteClientPhoto, setHeroPhoto } from "@/app/dashboard/actions";
import { PexelsPicker } from "@/components/dashboard/PexelsPicker";
import { PhotoUploadInput } from "@/components/dashboard/PhotoUploadInput";
import { PHOTO_CAP } from "@/lib/photos";
import { recommendedTemplateFor, isPhotoLedTemplate } from "@/lib/templates/recommend";

type Photo = { id: string; storage_path: string };

// Sprint 1, Build Item 11: photo upload used to only exist in the dashboard,
// after signup — a client's page could go fully live on stock imagery with
// no second visit ever prompting them to add real photos. Reuses the exact
// same multi-file upload/delete Server Actions the dashboard already uses
// (uploadClientPhoto requires an authenticated session, which the wizard
// already has), no new upload code needed. Skippable like the rest of this
// low-friction wizard — a client who skips still gets the stock-photo
// fallback, same as today, just now with the chance to add real ones first.
//
// Sprint "Onboarding two doors" item 3: the mechanism was never the gap.
// "Use as hero image" has existed on the dashboard the whole time and
// members did not know, so their best photo sat in position four while a
// stock image filled the front page. This step now does the choosing at
// the moment the photos arrive, says plainly why it matters, and tells
// them it can be changed later.
export function Step4PhotoUpload({
  initialPhotos,
  storageBase,
  industryHint,
  heroPhotoId,
  template,
  onSuccess,
}: {
  initialPhotos: Photo[];
  storageBase: string;
  industryHint?: string;
  heroPhotoId: string | null;
  template: string;
  onSuccess: () => void;
}) {
  // This step runs BEFORE the template picker, so most members arrive here
  // with no theme chosen yet. The recommendation for their trade is the
  // best available guess at what they will land on, and a member resuming
  // the wizard (or editing later) has a real saved template that wins.
  const likelyTemplate = template || recommendedTemplateFor(industryHint) || "";
  const photoLed = isPhotoLedTemplate(likelyTemplate);
  const atCap = initialPhotos.length >= PHOTO_CAP;
  const hero = initialPhotos.find((p) => p.id === heroPhotoId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">Add your photos</h2>
        <p className="mt-1 text-sm text-gray-500">
          This is the part that makes the biggest difference to your page. Real photos of your own
          work, your shop, your food or your team are what make a customer believe you before they
          read a word.
        </p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Two ways to do this</p>
        <ul className="mt-2 flex flex-col gap-1.5 text-sm text-gray-600">
          <li>
            <span className="font-semibold text-ink">Your own photos, always best.</span> Take them
            on your phone in daylight. A slightly imperfect real photo beats a perfect stock one.
          </li>
          <li>
            <span className="font-semibold text-ink">Or pick from our stock library.</span> Good for
            setting a mood while you gather your own. We never present a stock photo as your work,
            so it will not carry your name or a caption claiming it.
          </li>
        </ul>
      </div>

      <PhotoUploadInput disabled={atCap} />
      {atCap && (
        <p className="text-xs text-gray-400">
          You&apos;ve reached the {PHOTO_CAP}-photo limit. Remove one to add another.
        </p>
      )}

      <PexelsPicker industryHint={industryHint} disabled={atCap} />

      {initialPhotos.length > 0 && (
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-semibold text-ink">
              {photoLed ? "Now choose your front-page photo" : "Your photos"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {photoLed ? (
                hero ? (
                  <>
                    That&apos;s the one filling the top of your page. Tap another to change it, or
                    change it any time later from your dashboard.
                  </>
                ) : (
                  <>
                    The page style suited to your trade shows one big photo right at the top. Tap
                    the one you want there. You can change it any time later from your dashboard.
                  </>
                )
              ) : (
                <>
                  These appear through your page. You can add, remove or reorder them any time
                  later from your dashboard.
                </>
              )}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {initialPhotos.map((photo) => (
              <WizardPhoto
                key={photo.id}
                photo={photo}
                storageBase={storageBase}
                isHero={photo.id === heroPhotoId}
                showHeroControl={photoLed}
              />
            ))}
          </div>
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

// Larger than the old 4-across thumbnails, and the hero control sits on the
// card itself rather than only on hover: hover does not exist on a phone,
// which is where most of these members are.
function WizardPhoto({
  photo,
  storageBase,
  isHero,
  showHeroControl,
}: {
  photo: Photo;
  storageBase: string;
  isHero: boolean;
  showHeroControl: boolean;
}) {
  const [deleteState, deleteAction, deletePending] = useActionState(deleteClientPhoto, null);
  const [heroState, heroAction, heroPending] = useActionState(setHeroPhoto, null);

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
          sizes="(min-width: 640px) 160px, 33vw"
          className="object-cover"
        />
        {isHero && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">
            Front page
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-1 bg-white px-1.5 py-1.5">
        {showHeroControl ? (
          <form action={heroAction}>
            <input type="hidden" name="photoId" value={isHero ? "" : photo.id} />
            <button
              type="submit"
              disabled={heroPending}
              className={`rounded-full px-2 py-1 text-[10px] font-semibold disabled:opacity-50 ${
                isHero ? "text-gray-500 hover:text-gray-700" : "bg-brand/10 text-brand hover:bg-brand/20"
              }`}
            >
              {heroPending ? "Saving..." : isHero ? "Unset" : "Use this one"}
            </button>
          </form>
        ) : (
          <span />
        )}
        <form action={deleteAction}>
          <input type="hidden" name="photoId" value={photo.id} />
          <button
            type="submit"
            disabled={deletePending}
            className="px-1.5 py-1 text-[10px] font-semibold text-gray-400 underline-offset-2 hover:text-red-600 hover:underline disabled:opacity-50"
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
