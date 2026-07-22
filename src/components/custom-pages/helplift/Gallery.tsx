"use client";

import { useState } from "react";
import Image from "next/image";
import { HELPLIFT_LIME_DARK, HELPLIFT_INK } from "./brand";

// Sec 3 Gallery, reworked per Dewald (2026-07-22): the skills-development
// graphics now come from the client's own dashboard-managed photo gallery
// (client_photos), so Helplift can add / remove / reorder them themselves as
// courses change — exactly like every other self-build member. Shown as a
// compact thumbnail grid (was taking up too much of the page) that opens a
// full, uncropped lightbox on click, so the text baked into each graphic
// stays fully readable.
type Photo = { id: string; storage_path: string };

export function Gallery({ photos, storageBase }: { photos: Photo[]; storageBase: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  return (
    <section className="px-5 py-14 sm:px-8 sm:py-16" style={{ backgroundColor: "#FFFFFF" }}>
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: HELPLIFT_LIME_DARK }}>
            In Action
          </span>
          <h2 className="mt-3 font-[family-name:var(--font-helplift-heading)] text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: HELPLIFT_INK }}>
            Real people, real skills, real proof
          </h2>
          <p className="mt-4 text-base leading-relaxed text-gray-600">
            From our skills-development courses to the goods and support delivered across the Vaal Triangle. Tap any image to view it in full.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setOpenIndex(i)}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-gray-100 shadow-sm"
            >
              <Image
                src={`${storageBase}/${photo.storage_path}`}
                alt="Helplift skills-development moment"
                fill
                sizes="(min-width: 640px) 220px, 45vw"
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
              alt="Helplift skills-development moment, enlarged"
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
