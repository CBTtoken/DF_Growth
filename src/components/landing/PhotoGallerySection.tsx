"use client";

import { useState } from "react";
import Image from "next/image";

// The lookbook shows this many before folding the rest behind one tap.
// Dewald's live review of the first Marquee build: eleven photos in an
// editorial mosaic made the page "scroll forever". Seven keeps the
// browsing feel (one feature plus six tiles) and the button says exactly
// how many more there are.
const LOOKBOOK_PREVIEW_COUNT = 7;
import type { TemplateAnchor } from "@/lib/templates/anchors";
import { EYEBROW_STYLE_CLASS, SPACING_CLASS, SURFACE_SECTION_CLASS, SURFACE_BORDER_CLASS } from "@/lib/templates/anchors";

type Photo = { id: string; storage_path: string };

// Sprint 1, Build Item 10: photo gallery used to only ever be used as
// background/supporting imagery inside specific templates (e.g. Left-Heavy
// Split's hero) — never its own visible section a visitor could actually
// browse. This is a dedicated, shared section, works the same way
// regardless of which of the 10 templates or Classic Conversion a client
// has chosen, separate from and in addition to any "primary" photo used
// elsewhere. Client component only for the lightbox interaction — the grid
// itself needs no JS to render.
export function PhotoGallerySection({
  photos,
  storageBase,
  accentColor,
  eyebrowNumber,
  anchor,
}: {
  photos: Photo[];
  storageBase: string;
  accentColor: string;
  eyebrowNumber: string;
  anchor?: TemplateAnchor;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Spec: renders only with 2+ photos — a single photo isn't a "gallery",
  // and it would just be an awkward, empty-feeling half-section otherwise.
  if (photos.length < 2) return null;

  if (!anchor) {
    return (
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
          <p className="font-mono text-sm font-semibold uppercase tracking-[0.2em] sm:text-base" style={{ color: accentColor }}>
            {eyebrowNumber} · Gallery
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setOpenIndex(i)}
                className="group relative aspect-square overflow-hidden rounded-xl border border-gray-100"
              >
                <Image
                  src={`${storageBase}/${photo.storage_path}`}
                  alt="Business photo"
                  fill
                  sizes="(min-width: 768px) 200px, 45vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        </div>

        {openIndex !== null && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setOpenIndex(null)}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(null)}
              aria-label="Close"
              className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-2xl text-white transition hover:bg-white/20"
            >
              &times;
            </button>
            <div className="relative h-full max-h-[85vh] w-full max-w-3xl">
              <Image
                src={`${storageBase}/${photos[openIndex].storage_path}`}
                alt="Business photo, enlarged"
                fill
                sizes="90vw"
                className="object-contain"
              />
            </div>
          </div>
        )}
      </section>
    );
  }

  const isDark = anchor.sectionSurface === "dark";

  if (anchor.galleryLayout === "job-wall") {
    // Copperline anchor: the member's own job photos as printed pictures on
    // a wall — thick white borders, a slight alternating tilt that
    // straightens on touch, no crops into squares. For the informal-market
    // customer these photos ARE the business's credibility, so they get
    // room and warmth rather than a filing-system treatment.
    return (
      <section className={`border-b ${SURFACE_BORDER_CLASS[anchor.sectionSurface]} bg-[#faf7f2]`}>
        <div className={`mx-auto max-w-5xl px-4 sm:px-8 ${SPACING_CLASS[anchor.spacing]}`}>
          <p className={EYEBROW_STYLE_CLASS[anchor.eyebrowStyle]} style={{ color: accentColor }}>
            {eyebrowNumber} · Our work
          </p>
          <h2 className="mt-3 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl">
            Real jobs, photographed by us.
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 sm:gap-7">
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setOpenIndex(i)}
                className={`group bg-white p-2 pb-3 shadow-md transition-transform duration-200 hover:rotate-0 hover:shadow-xl sm:p-2.5 sm:pb-4 ${
                  i % 3 === 0 ? "-rotate-[1.25deg]" : i % 3 === 1 ? "rotate-[1.25deg]" : "-rotate-[0.5deg]"
                }`}
              >
                <span className="relative block aspect-[4/3] overflow-hidden bg-gray-100">
                  <Image
                    src={`${storageBase}/${photo.storage_path}`}
                    alt="A real job, photographed by the business"
                    fill
                    sizes="(min-width: 768px) 300px, 45vw"
                    className="object-cover"
                  />
                </span>
              </button>
            ))}
          </div>
        </div>

        {openIndex !== null && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setOpenIndex(null)}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(null)}
              aria-label="Close"
              className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-2xl text-white transition hover:bg-white/20"
            >
              &times;
            </button>
            <div className="relative h-full max-h-[85vh] w-full max-w-3xl">
              <Image
                src={`${storageBase}/${photos[openIndex].storage_path}`}
                alt="Work photo, enlarged"
                fill
                sizes="90vw"
                className="object-contain"
              />
            </div>
          </div>
        )}
      </section>
    );
  }

  if (anchor.galleryLayout === "lookbook") {
    // Marquee anchor: for an events business the photos ARE the product,
    // so this is a browsing mosaic rather than a filing grid. The first
    // photo runs tall at portrait scale the way a lookbook opens, the rest
    // alternate landscape and square, and everything gets generous gaps
    // and no border clutter — the photography carries it. Past the
    // preview count the rest fold behind one tap, so a big gallery makes
    // the page richer instead of longer.
    const visiblePhotos = showAll ? photos : photos.slice(0, LOOKBOOK_PREVIEW_COUNT);
    const hiddenCount = photos.length - visiblePhotos.length;
    return (
      <section className={`border-b ${SURFACE_BORDER_CLASS[anchor.sectionSurface]} bg-white`}>
        <div className={`mx-auto max-w-5xl px-4 sm:px-8 ${SPACING_CLASS[anchor.spacing]}`}>
          <p className={EYEBROW_STYLE_CLASS[anchor.eyebrowStyle]} style={{ color: accentColor }}>
            {eyebrowNumber} · Gallery
          </p>
          <h2 className="mt-3 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-gray-900 font-[family-name:var(--font-anchor-serif)] sm:text-3xl">
            Moments from past events.
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
            {visiblePhotos.map((photo, i) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setOpenIndex(i)}
                className={`group relative overflow-hidden ${
                  i === 0
                    ? "col-span-2 row-span-2 aspect-[4/5] sm:col-span-2 sm:aspect-[4/5]"
                    : i % 4 === 1
                      ? "aspect-square"
                      : "aspect-[4/3]"
                }`}
              >
                <Image
                  src={`${storageBase}/${photo.storage_path}`}
                  alt="A past event"
                  fill
                  sizes={i === 0 ? "(min-width: 768px) 640px, 90vw" : "(min-width: 768px) 300px, 45vw"}
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </button>
            ))}
          </div>

          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mx-auto mt-8 block rounded-full border border-gray-300 px-7 py-3.5 text-base font-semibold text-gray-700 transition hover:border-gray-500"
            >
              See {hiddenCount} more {hiddenCount === 1 ? "photo" : "photos"}
            </button>
          )}
        </div>

        {openIndex !== null && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setOpenIndex(null)}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(null)}
              aria-label="Close"
              className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-2xl text-white transition hover:bg-white/20"
            >
              &times;
            </button>
            <div className="relative h-full max-h-[85vh] w-full max-w-3xl">
              <Image
                src={`${storageBase}/${photos[openIndex].storage_path}`}
                alt="Event photo, enlarged"
                fill
                sizes="90vw"
                className="object-contain"
              />
            </div>
          </div>
        )}
      </section>
    );
  }

  if (anchor.galleryLayout === "evidence-board") {
    // Fieldwork anchor: photos as job evidence, not a mood board. The first
    // photo runs wide at documentary scale, the rest tile beside it; every
    // frame is square-cornered with a mono REF label, so the section reads
    // like prints clipped to a site file.
    return (
      <section className={`border-b ${SURFACE_BORDER_CLASS[anchor.sectionSurface]} ${isDark ? SURFACE_SECTION_CLASS.dark : "bg-white"}`}>
        <div className={`mx-auto max-w-5xl px-4 sm:px-8 ${SPACING_CLASS[anchor.spacing]}`}>
          <p className={EYEBROW_STYLE_CLASS[anchor.eyebrowStyle]} style={{ color: accentColor }}>
            {eyebrowNumber} · From the job
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {photos.map((photo, i) => (
              <figure key={photo.id} className={i === 0 ? "col-span-2 row-span-2" : "col-span-1"}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(i)}
                  className={`group relative block w-full overflow-hidden border ${isDark ? "border-gray-700" : "border-gray-300"} ${
                    i === 0 ? "aspect-[4/3]" : "aspect-square"
                  }`}
                >
                  <Image
                    src={`${storageBase}/${photo.storage_path}`}
                    alt="Work photo"
                    fill
                    sizes={i === 0 ? "(min-width: 768px) 640px, 90vw" : "(min-width: 768px) 300px, 45vw"}
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </button>
                <figcaption
                  className="mt-1.5 font-mono text-[0.6rem] font-bold uppercase tracking-[0.25em]"
                  style={{ color: accentColor }}
                >
                  Ref {String(i + 1).padStart(2, "0")}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        {openIndex !== null && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setOpenIndex(null)}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(null)}
              aria-label="Close"
              className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-2xl text-white transition hover:bg-white/20"
            >
              &times;
            </button>
            <div className="relative h-full max-h-[85vh] w-full max-w-3xl">
              <Image
                src={`${storageBase}/${photos[openIndex].storage_path}`}
                alt="Work photo, enlarged"
                fill
                sizes="90vw"
                className="object-contain"
              />
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className={`border-b ${SURFACE_BORDER_CLASS[anchor.sectionSurface]} ${isDark ? SURFACE_SECTION_CLASS.dark : "bg-white"}`}>
      <div className={`mx-auto max-w-5xl px-4 sm:px-8 ${SPACING_CLASS[anchor.spacing]}`}>
        <p className={EYEBROW_STYLE_CLASS[anchor.eyebrowStyle]} style={{ color: accentColor }}>
          {eyebrowNumber} · Gallery
        </p>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setOpenIndex(i)}
              className={`group relative aspect-square overflow-hidden rounded-xl border ${isDark ? "border-gray-700" : "border-gray-100"}`}
            >
              <Image
                src={`${storageBase}/${photo.storage_path}`}
                alt="Business photo"
                fill
                sizes="(min-width: 768px) 200px, 45vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </button>
          ))}
        </div>
      </div>

      {openIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpenIndex(null)}
        >
          <button
            type="button"
            onClick={() => setOpenIndex(null)}
            aria-label="Close"
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-2xl text-white transition hover:bg-white/20"
          >
            &times;
          </button>
          <div className="relative h-full max-h-[85vh] w-full max-w-3xl">
            <Image
              src={`${storageBase}/${photos[openIndex].storage_path}`}
              alt="Business photo, enlarged"
              fill
              sizes="90vw"
              className="object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}
