"use client";

import { useState } from "react";
import Image from "next/image";

// Dewald's ask 2026-07-22: a "From the farm" gallery for Buffelskop, fed by
// the client's own dashboard-managed photo gallery (client_photos) so they
// can add / remove / reorder farm photos themselves — same self-service
// pattern now used on the Helplift page. Styled to match Buffelskop's rustic
// premium look (kraft ground, Playfair serif, deep-red + gold accents), with
// a full-size lightbox on tap.
type Photo = { id: string; storage_path: string };

const RED = "#A62F1D";
const GOLD = "#B07A2E";

export function Gallery({ photos, storageBase }: { photos: Photo[]; storageBase: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (photos.length < 2) return null;

  return (
    <section className="bg-[#F8F1E4] px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-[family-name:var(--font-buffelskop-serif)] text-sm uppercase tracking-[0.35em]" style={{ color: GOLD }}>
            From the Farm
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-buffelskop-serif)] text-3xl font-semibold tracking-tight text-[#2B1B14] sm:text-4xl">
            Grown, sun-dried and milled in Rustenburg
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#5C4A3F]">
            From our lands to the last freshly milled batch. Tap any photo to view it in full.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setOpenIndex(i)}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-[#E0D3B8] shadow-sm"
            >
              <Image
                src={`${storageBase}/${photo.storage_path}`}
                alt="Buffelskop chilli farm"
                fill
                sizes="(min-width: 640px) 300px, 45vw"
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
            style={{ outlineColor: RED }}
          >
            &times;
          </button>
          <div className="relative h-full max-h-[85vh] w-full max-w-3xl">
            <Image
              src={`${storageBase}/${photos[openIndex].storage_path}`}
              alt="Buffelskop chilli farm, enlarged"
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
