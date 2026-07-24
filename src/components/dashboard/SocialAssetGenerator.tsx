"use client";

import { useActionState, useState } from "react";
import { generateSocialAsset } from "@/app/dashboard/actions";
import { ASSET_CONTENT_TYPES, type AssetContentType } from "@/lib/assets/content-types";
import { Card } from "@/components/ui/Card";

type Photo = { id: string; storage_path: string };

// Combined spec Sec 25: an image picker drawing from the client's own
// gallery (client_photos) — that gallery already supports both direct
// upload and Pexels search-and-add (Sec 24), so this reuses it as the
// single source for "the client's own image or one from Pexels" rather
// than building a third, parallel upload/search flow just for this
// generator.
function GalleryImagePicker({
  photos,
  storageBase,
  selectedUrl,
  onSelect,
  label,
}: {
  photos: Photo[];
  storageBase: string;
  selectedUrl: string;
  onSelect: (url: string) => void;
  label: string;
}) {
  if (photos.length === 0) {
    return (
      <p className="text-xs text-gray-400">
        No photos in your gallery yet — add some above to use one here, or skip the image for a
        text-only design.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-gray-700">{label}</span>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
        {photos.map((p) => {
          const url = `${storageBase}/${p.storage_path}`;
          const isSelected = selectedUrl === url;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(isSelected ? "" : url)}
              className={`relative aspect-square overflow-hidden rounded-lg border-2 ${
                isSelected ? "border-brand" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              {isSelected && (
                <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-brand text-[9px] font-bold text-white">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Combined spec Sec 25: replaces the testimonial-only asset generator with
// a broader one covering 4 more content types (testimonials keep their
// own existing flow in the Testimonials section above — this is
// specifically the new ones). Style choice lives in AssetStyleSection,
// rendered directly above this one in dashboard/page.tsx — one style
// setting for the whole account, not a second picker duplicated in here.
export function SocialAssetGenerator({ photos, storageBase }: { photos: Photo[]; storageBase: string }) {
  const [state, formAction, pending] = useActionState(generateSocialAsset, null);
  const [contentType, setContentType] = useState<AssetContentType>("special-offer");
  const [imageUrl, setImageUrl] = useState("");
  const [beforeUrl, setBeforeUrl] = useState("");
  const [afterUrl, setAfterUrl] = useState("");

  const meta = ASSET_CONTENT_TYPES.find((t) => t.id === contentType)!;

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink">Create your image ready for Facebook and Instagram posts</h2>
        <p className="mt-1 text-sm text-gray-500">
          {state?.success ? "Generated — download it below in Generated social assets." : "Pick what you're posting about."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ASSET_CONTENT_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setContentType(t.id)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
              contentType === t.id ? "border-brand bg-brand/5 text-brand" : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="contentType" value={contentType} />

        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
          {meta.headlineLabel}
          <input
            type="text"
            name="headline"
            placeholder={meta.headlinePlaceholder}
            required
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>
        {state?.error?.headline && <p className="text-xs text-red-600">{state.error.headline[0]}</p>}

        {contentType !== "before-after" && (
          <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            {meta.subtextLabel} <span className="font-normal text-gray-400">(optional)</span>
            <input
              type="text"
              name="subtext"
              placeholder={meta.subtextPlaceholder}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
        )}

        {contentType === "before-after" ? (
          <>
            <input type="hidden" name="beforeImageUrl" value={beforeUrl} />
            <input type="hidden" name="afterImageUrl" value={afterUrl} />
            <GalleryImagePicker photos={photos} storageBase={storageBase} selectedUrl={beforeUrl} onSelect={setBeforeUrl} label="Before photo" />
            <GalleryImagePicker photos={photos} storageBase={storageBase} selectedUrl={afterUrl} onSelect={setAfterUrl} label="After photo" />
            {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}
          </>
        ) : (
          <>
            <input type="hidden" name="imageUrl" value={imageUrl} />
            <GalleryImagePicker
              photos={photos}
              storageBase={storageBase}
              selectedUrl={imageUrl}
              onSelect={setImageUrl}
              label="Background photo (optional)"
            />
          </>
        )}

        {state?.error?._form && contentType !== "before-after" && (
          <p className="text-xs text-red-600">{state.error._form[0]}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 w-fit inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {pending ? "Generating..." : "Generate image"}
        </button>
      </form>
    </Card>
  );
}
