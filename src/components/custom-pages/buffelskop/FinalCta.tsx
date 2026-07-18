import Image from "next/image";

// toWhatsAppLink mirrors the exact conversion used in components/landing/
// LeadForm.tsx — local SA numbers ("082 824 8328") need the leading 0
// replaced with the country code for a working wa.me link.
function toWhatsAppLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const international = digits.startsWith("0") ? `27${digits.slice(1)}` : digits;
  return `https://wa.me/${international}`;
}

export function FinalCta({ callPhone, contactEmail }: { callPhone: string | null; contactEmail: string | null }) {
  return (
    <section className="relative flex min-h-[80vh] items-center overflow-hidden px-6 py-24 text-center text-white">
      <Image
        src="/custom-pages/buffelskop/coarse-bag.jpg"
        alt="Buffelskop sundried cayenne chilli powder among fresh chillies"
        fill
        sizes="100vw"
        className="object-cover"
      />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-black/50" />

      <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6">
        <div className="relative h-16 w-28 overflow-hidden rounded-lg border border-white/25 shadow-lg">
          <Image
            src="/custom-pages/buffelskop/logo-card.jpg"
            alt="Buffelskop hand-drawn brand mark"
            fill
            sizes="112px"
            className="object-cover"
          />
        </div>

        <h2 className="font-[family-name:var(--font-buffelskop-serif)] text-3xl font-semibold uppercase tracking-wide sm:text-5xl">
          Ready To Add Some Heat?
        </h2>
        <p className="max-w-lg text-base leading-relaxed text-white/85 sm:text-lg">
          Premium quality. Naturally sun-dried. Hand-picked. Preservative-free. Available
          throughout South Africa.
        </p>

        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
          {callPhone && (
            <a
              href={`tel:${callPhone.replace(/\s+/g, "")}`}
              className="flex flex-col items-center gap-1 text-white transition hover:text-[#E7B36A]"
            >
              <span className="text-sm font-semibold uppercase tracking-[0.25em] text-white/60">📞 Contact Jaco</span>
              <span className="text-xl font-semibold">{callPhone}</span>
            </a>
          )}
          {callPhone && (
            <a
              href={toWhatsAppLink(callPhone)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5"
            >
              WhatsApp Jaco
            </a>
          )}
          {contactEmail && (
            <a
              href={`mailto:${contactEmail}`}
              className="flex flex-col items-center gap-1 text-white transition hover:text-[#E7B36A]"
            >
              <span className="text-sm font-semibold uppercase tracking-[0.25em] text-white/60">✉ Email Adri</span>
              <span className="text-xl font-semibold">{contactEmail}</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
