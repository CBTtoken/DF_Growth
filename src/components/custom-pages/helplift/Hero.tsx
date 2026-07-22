import Image from "next/image";
import { HELPLIFT_BLUE, HELPLIFT_BLUE_DARK, HELPLIFT_LIME, HAS_LOGO } from "./brand";

// Sec 3 Hero: no wide-format hero photo was supplied and the material is
// close-up gallery imagery, so this is a clean colour-block hero built from
// the logo's blue + lime rather than a stretched, unsuitable photo. Logo
// slot is gated on HAS_LOGO so preview never shows a broken image before
// the real file lands.
export function Hero({ callPhone }: { callPhone: string | null }) {
  return (
    <section
      className="relative overflow-hidden px-5 py-20 text-white sm:px-8 sm:py-28"
      style={{ background: `linear-gradient(135deg, ${HELPLIFT_BLUE_DARK} 0%, ${HELPLIFT_BLUE} 55%, ${HELPLIFT_LIME} 140%)` }}
    >
      {/* Soft decorative blooms, not a photo — keeps the warm, human feel
          the brief asks for without forcing unsuitable imagery. */}
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-white/10 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 size-80 rounded-full" style={{ backgroundColor: `${HELPLIFT_LIME}33`, filter: "blur(48px)" }} />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        {HAS_LOGO ? (
          <Image
            src="/custom-pages/helplift/logo.png"
            alt="Helplift Network Vaal Triangle"
            width={132}
            height={132}
            className="mb-7 size-28 rounded-full bg-white/95 object-contain p-3 shadow-lg sm:size-32"
            priority
          />
        ) : (
          <span className="mb-7 grid size-28 place-items-center rounded-full bg-white/95 text-center shadow-lg sm:size-32">
            <span className="px-2 text-sm font-extrabold leading-tight" style={{ color: HELPLIFT_BLUE }}>
              HELPLIFT
              <span className="mt-0.5 block text-[0.6rem] font-semibold tracking-wide" style={{ color: "#6FA82E" }}>
                NETWORK
              </span>
            </span>
          </span>
        )}

        <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest backdrop-blur">
          Non-Profit Organisation · NPO 152-090
        </span>

        <h1 className="font-[family-name:var(--font-helplift-heading)] text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
          Inspire and Enable people to help people
        </h1>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
          In the Vaal Triangle, we connect the generosity of donors and volunteers directly to the
          real needs of the community — through giving, dignity, skills, and support.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <a
            href="#lead-form"
            className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-bold shadow-sm transition hover:-translate-y-0.5"
            style={{ color: HELPLIFT_BLUE_DARK }}
          >
            Get Involved
          </a>
          {callPhone && (
            <a
              href={`tel:${callPhone.replace(/\s+/g, "")}`}
              className="inline-flex items-center justify-center rounded-full border-2 border-white/70 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Call {callPhone}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
