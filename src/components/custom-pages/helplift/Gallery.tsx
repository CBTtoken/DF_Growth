import Image from "next/image";
import { GALLERY_IMAGES, HELPLIFT_LIME_DARK, HELPLIFT_INK } from "./brand";

// Sec 3 Gallery: the real sewing-course photos (certificate presentations,
// finished bag/blanket projects) plus the full 2025/26 impact infographic
// PNG as its own item. Do NOT include any image with the NWU logo or the
// "Global Innovative Forefront Talent" mark — those are excluded when the
// files are added to GALLERY_IMAGES.
//
// Until the real files land in public/custom-pages/helplift/ (GALLERY_IMAGES
// is populated), this renders a quiet placeholder rather than broken images.
// The page stays unpublished during that window.
export function Gallery() {
  if (GALLERY_IMAGES.length === 0) {
    return (
      <section className="px-5 py-16 sm:px-8" style={{ backgroundColor: "#FFFFFF" }}>
        <div className="mx-auto max-w-3xl rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-10 text-center">
          <p className="font-[family-name:var(--font-helplift-heading)] text-lg font-bold" style={{ color: HELPLIFT_INK }}>
            Gallery — photos to be added
          </p>
          <p className="mt-2 text-sm text-gray-500">
            The real sewing-course photos and the 2025/26 impact infographic slot in here before this page goes live.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-5 py-20 sm:px-8 sm:py-24" style={{ backgroundColor: "#FFFFFF" }}>
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: HELPLIFT_LIME_DARK }}>
            In Action
          </span>
          <h2 className="mt-3 font-[family-name:var(--font-helplift-heading)] text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: HELPLIFT_INK }}>
            Real people, real skills, real proof
          </h2>
          <p className="mt-4 text-base leading-relaxed text-gray-600">
            From our skills-development courses to the goods and support delivered across the Vaal Triangle.
          </p>
        </div>

        {/* These are self-contained designed graphics (text baked in), so
            they render object-contain on a soft card — never cropped, so no
            wording is cut off. The wide 2025/26 infographic spans the row. */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {GALLERY_IMAGES.map((img) => (
            <div
              key={img.src}
              className={`relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-2 shadow-sm ${
                img.wide ? "sm:col-span-2 aspect-[3/2]" : "aspect-square"
              }`}
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                className="rounded-xl object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
