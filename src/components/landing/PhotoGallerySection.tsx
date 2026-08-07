"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// The lookbook shows this many before folding the rest behind one tap.
// Dewald's live review of the first Marquee build: eleven photos in an
// editorial mosaic made the page "scroll forever". Seven keeps the
// browsing feel (one feature plus six tiles) and the button says exactly
// how many more there are.
const LOOKBOOK_PREVIEW_COUNT = 7;
import type { TemplateAnchor } from "@/lib/templates/anchors";
import { HEADING_FONT_CLASS, EYEBROW_STYLE_CLASS, SPACING_CLASS, SURFACE_SECTION_CLASS, SURFACE_BORDER_CLASS } from "@/lib/templates/anchors";

type Photo = { id: string; storage_path: string };

// Every gallery layout below opened the same enlarged view with only a
// close button — SIP Happens' direct feedback: no way to move to the next
// photo without closing and picking another thumbnail. Pulled into one
// shared component (was six near-identical copies) so prev/next and
// keyboard arrows land everywhere at once, not just wherever a variant
// happened to get touched next.
function Lightbox({
  photos,
  storageBase,
  openIndex,
  onClose,
  onNavigate,
  altText,
}: {
  photos: Photo[];
  storageBase: string;
  openIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  altText: string;
}) {
  const hasMultiple = photos.length > 1;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (hasMultiple && e.key === "ArrowLeft") onNavigate((openIndex - 1 + photos.length) % photos.length);
      if (hasMultiple && e.key === "ArrowRight") onNavigate((openIndex + 1) % photos.length);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [openIndex, hasMultiple, photos.length, onClose, onNavigate]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-2xl text-white transition hover:bg-white/20"
      >
        &times;
      </button>
      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate((openIndex - 1 + photos.length) % photos.length);
            }}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-2xl text-white transition hover:bg-white/20 sm:left-4"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate((openIndex + 1) % photos.length);
            }}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-2xl text-white transition hover:bg-white/20 sm:right-4"
          >
            ›
          </button>
        </>
      )}
      <div className="relative h-full max-h-[85vh] w-full max-w-3xl">
        <Image src={`${storageBase}/${photos[openIndex].storage_path}`} alt={altText} fill sizes="90vw" className="object-contain" />
      </div>
    </div>
  );
}

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
          <Lightbox
            photos={photos}
            storageBase={storageBase}
            openIndex={openIndex}
            onClose={() => setOpenIndex(null)}
            onNavigate={setOpenIndex}
            altText="Business photo, enlarged"
          />
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
          <Lightbox
            photos={photos}
            storageBase={storageBase}
            openIndex={openIndex}
            onClose={() => setOpenIndex(null)}
            onNavigate={setOpenIndex}
            altText="Work photo, enlarged"
          />
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
            {anchor.id === "atelier" ? "A look at finished work." : "Moments from past events."}
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
          <Lightbox
            photos={visiblePhotos}
            storageBase={storageBase}
            openIndex={openIndex}
            onClose={() => setOpenIndex(null)}
            onNavigate={setOpenIndex}
            altText="Event photo, enlarged"
          />
        )}
      </section>
    );
  }

  if (anchor.galleryLayout === "kitchen-pass") {
    // Kasi Kitchen anchor: the pass — the counter where plates land ready
    // to go out. Two stacked rows share one horizontal scroll, every tile
    // the same square, so a big set of plate photos reads rich rather than
    // long (the filmstrip lesson, doubled — twice the food per swipe).
    // Food photography needs no frames: tight gaps, no borders, warm paper
    // behind, the plates carry it.
    return (
      <section className={`border-b ${SURFACE_BORDER_CLASS[anchor.sectionSurface]} bg-[#fbf6ee]`}>
        <div className={`mx-auto max-w-5xl ${SPACING_CLASS[anchor.spacing]}`}>
          <div className="px-4 sm:px-8">
            <p className={EYEBROW_STYLE_CLASS[anchor.eyebrowStyle]} style={{ color: accentColor }}>
              {eyebrowNumber} · From the pass
            </p>
            <h2 className={`mt-4 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl ${HEADING_FONT_CLASS[anchor.headingFont]}`}>
              Our food, photographed by us.
            </h2>
          </div>
          <div className="mt-8 grid snap-x grid-flow-col grid-rows-2 gap-2 overflow-x-auto px-4 pb-2 sm:gap-2.5 sm:px-8 [scrollbar-width:thin]">
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setOpenIndex(i)}
                className="group relative aspect-square w-[150px] snap-start overflow-hidden rounded-md sm:w-[210px]"
              >
                <Image
                  src={`${storageBase}/${photo.storage_path}`}
                  alt="A plate from our kitchen"
                  fill
                  sizes="(min-width: 640px) 210px, 150px"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                />
              </button>
            ))}
          </div>
          <p className="mt-3 px-4 text-xs text-gray-400 sm:px-8">Scroll for more →</p>
        </div>

        {openIndex !== null && (
          <Lightbox
            photos={photos}
            storageBase={storageBase}
            openIndex={openIndex}
            onClose={() => setOpenIndex(null)}
            onNavigate={setOpenIndex}
            altText="A plate from our kitchen, enlarged"
          />
        )}
      </section>
    );
  }

  if (anchor.galleryLayout === "filmstrip") {
    // Marquee anchor, reworked 6 August after SIP Happens' direct feedback
    // on the original "lookbook" mosaic: mixing a portrait hero tile with
    // alternating square/4:3 tiles read as scattered once a real photo set
    // of varying aspect ratios went in, the opposite of "the photography
    // carries the page". Every tile here is the same 4:3 shape and the row
    // just scrolls, so there's no mismatch to notice and no photo count
    // that ever looks wrong — 5 photos or 50 read the same way.
    return (
      <section className={`border-b ${SURFACE_BORDER_CLASS[anchor.sectionSurface]} bg-white`}>
        <div className={`mx-auto max-w-5xl ${SPACING_CLASS[anchor.spacing]}`}>
          <div className="px-4 sm:px-8">
            <p className={EYEBROW_STYLE_CLASS[anchor.eyebrowStyle]} style={{ color: accentColor }}>
              {eyebrowNumber} · Gallery
            </p>
            <h2 className="mt-3 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-gray-900 font-[family-name:var(--font-anchor-serif)] sm:text-3xl">
              Moments from past events.
            </h2>
          </div>
          <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:gap-6 sm:px-8 [scrollbar-width:thin]">
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setOpenIndex(i)}
                className="group relative aspect-[4/3] w-[260px] flex-shrink-0 snap-start overflow-hidden sm:w-[340px]"
              >
                <Image
                  src={`${storageBase}/${photo.storage_path}`}
                  alt="A past event"
                  fill
                  sizes="(min-width: 640px) 340px, 260px"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </button>
            ))}
          </div>
          <p className="mt-3 px-4 text-xs text-gray-400 sm:px-8">Scroll for more →</p>
        </div>

        {openIndex !== null && (
          <Lightbox
            photos={photos}
            storageBase={storageBase}
            openIndex={openIndex}
            onClose={() => setOpenIndex(null)}
            onNavigate={setOpenIndex}
            altText="Event photo, enlarged"
          />
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
          <Lightbox
            photos={photos}
            storageBase={storageBase}
            openIndex={openIndex}
            onClose={() => setOpenIndex(null)}
            onNavigate={setOpenIndex}
            altText="Work photo, enlarged"
          />
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
        <Lightbox
          photos={photos}
          storageBase={storageBase}
          openIndex={openIndex}
          onClose={() => setOpenIndex(null)}
          onNavigate={setOpenIndex}
          altText="Business photo, enlarged"
        />
      )}
    </section>
  );
}
