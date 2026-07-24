"use client";

import { useState } from "react";
import Image from "next/image";
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

  // Spec: renders only with 2+ photos — a single photo isn't a "gallery",
  // and it would just be an awkward, empty-feeling half-section otherwise.
  if (photos.length < 2) return null;

  if (!anchor) {
    return (
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8 sm:py-24">
          <p className="font-mono text-sm font-semibold uppercase tracking-[0.2em] sm:text-base" style={{ color: accentColor }}>
            {eyebrowNumber} — Gallery
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

  return (
    <section className={`border-b ${SURFACE_BORDER_CLASS[anchor.sectionSurface]} ${isDark ? SURFACE_SECTION_CLASS.dark : "bg-white"}`}>
      <div className={`mx-auto max-w-5xl px-4 sm:px-8 ${SPACING_CLASS[anchor.spacing]}`}>
        <p className={EYEBROW_STYLE_CLASS[anchor.eyebrowStyle]} style={{ color: accentColor }}>
          {eyebrowNumber} — Gallery
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
