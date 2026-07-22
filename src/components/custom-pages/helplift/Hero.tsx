import Image from "next/image";
import { HELPLIFT_BLUE, HELPLIFT_BLUE_DARK, HELPLIFT_LIME, HELPLIFT_LIME_DARK, HELPLIFT_INK } from "./brand";

// Sec 3 Hero, elevated per Dewald (2026-07-22): built around the full
// horizontal logo (logo-full.png) rather than the circular mark, and led
// by a headline that names the challenge Helplift solves — the gap between
// people who have more than enough and people who go without — so a first-
// time visitor immediately identifies with it and wants to help. Light,
// warm ground (their own blue + lime as soft accents) keeps the human,
// not-clinical feel the brief asks for; no stretched hero photo is forced.
export function Hero({ callPhone }: { callPhone: string | null }) {
  return (
    <section className="relative overflow-hidden bg-white px-5 pb-14 pt-10 sm:px-8 sm:pb-16 sm:pt-14">
      {/* Soft brand blooms — warmth without an unsuitable photo. */}
      <div aria-hidden className="pointer-events-none absolute -right-28 -top-28 size-80 rounded-full" style={{ backgroundColor: `${HELPLIFT_BLUE}12`, filter: "blur(40px)" }} />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full" style={{ backgroundColor: `${HELPLIFT_LIME}1f`, filter: "blur(56px)" }} />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <Image
          src="/custom-pages/helplift/logo-full.png"
          alt="Helplift Network — Inspire and Enable people to help people"
          width={520}
          height={160}
          priority
          className="h-auto w-full max-w-[240px] sm:max-w-[380px]"
        />

        <span
          className="mt-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
          style={{ backgroundColor: `${HELPLIFT_BLUE}12`, color: HELPLIFT_BLUE_DARK }}
        >
          Non-Profit Organisation · Vaal Triangle · NPO 152-090
        </span>

        <h1
          className="mt-5 font-[family-name:var(--font-helplift-heading)] text-[2rem] font-bold leading-[1.18] tracking-tight text-balance sm:text-5xl sm:leading-[1.12] md:text-[3.25rem]"
          style={{ color: HELPLIFT_INK }}
        >
          Some have more than enough. Others go{" "}
          <span style={{ color: HELPLIFT_LIME_DARK }}>without</span>. We connect the two.
        </h1>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-gray-600 sm:text-lg">
          Helplift Network links the generosity of donors and volunteers directly to real needs in
          our community — with dignity, skill, and care. This is how ordinary people change the
          world: by helping each other.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <a
            href="#lead-form"
            className="inline-flex items-center justify-center rounded-full px-8 py-3.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5"
            style={{ backgroundColor: HELPLIFT_BLUE }}
          >
            I want to help
          </a>
          {callPhone && (
            <a
              href={`tel:${callPhone.replace(/\s+/g, "")}`}
              className="inline-flex items-center justify-center rounded-full border-2 px-8 py-3.5 text-sm font-bold transition hover:-translate-y-0.5"
              style={{ borderColor: `${HELPLIFT_BLUE}33`, color: HELPLIFT_BLUE_DARK }}
            >
              Call {callPhone}
            </a>
          )}
        </div>

        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: HELPLIFT_LIME_DARK }}>
          Inspire · Enable · Empower
        </p>
      </div>
    </section>
  );
}
