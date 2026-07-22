"use client";

import { useState } from "react";
import Image from "next/image";
import { HELPLIFT_LIME_DARK, HELPLIFT_INK, HELPLIFT_CREAM } from "./brand";

// Sec 3 Gallery, per Dewald (2026-07-22): the 2025/26 operational impact
// infographic gets its own headed section instead of being a page-dominating
// full-bleed block. Shown at a contained size with a clear heading; tap to
// open the full, readable detail in a lightbox. Kept as a curated static
// asset (it changes roughly yearly) rather than in the self-managed photo
// gallery, so it always keeps this dedicated placement.
const INFOGRAPHIC_SRC = "/custom-pages/helplift/impact-2025-26.jpg";

export function Infographic() {
  const [open, setOpen] = useState(false);

  return (
    <section className="px-5 py-20 sm:px-8 sm:py-24" style={{ backgroundColor: HELPLIFT_CREAM }}>
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: HELPLIFT_LIME_DARK }}>
            The Full Picture
          </span>
          <h2 className="mt-3 font-[family-name:var(--font-helplift-heading)] text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: HELPLIFT_INK }}>
            Who we are, in one view
          </h2>
          <p className="mt-4 text-base leading-relaxed text-gray-600">
            Our whole operating model and 2025/26 community impact, on a single page. Tap to open it in full.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative mx-auto mt-10 block w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <Image
            src={INFOGRAPHIC_SRC}
            alt="Helplift Network operational model and community impact for 2025/26"
            width={1536}
            height={1024}
            sizes="(min-width: 768px) 768px, 100vw"
            className="h-auto w-full"
          />
          <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
            Tap to enlarge
          </span>
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-2xl text-white transition hover:bg-white/20"
          >
            &times;
          </button>
          <div className="relative h-full max-h-[90vh] w-full max-w-5xl">
            <Image
              src={INFOGRAPHIC_SRC}
              alt="Helplift Network 2025/26 impact, enlarged"
              fill
              sizes="95vw"
              className="object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}
