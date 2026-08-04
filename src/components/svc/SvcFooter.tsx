import Image from "next/image";
import Link from "next/link";

/**
 * SVC's site footer. Near-black strip per the Brand Identity Guide's
 * closing-post rule; the logo sits small as a signature, never a
 * centrepiece.
 *
 * The ECT Act section 43 block renders clearly marked placeholders for the
 * company details the current site does not state anywhere (handoff 3.5):
 * registered name, company registration number, physical address, directors
 * and contact email are Dewald's open item 8 and are listed in the Sprint 1
 * report. Do not invent them.
 */
const COMPANY_DETAILS_PENDING = [
  ["Registered name", "[Registered company name to be supplied]"],
  ["Registration number", "[Company registration number to be supplied]"],
  ["Physical address", "[Registered physical address to be supplied]"],
  ["Directors", "[Director names to be supplied]"],
  ["Contact email", "[Official contact email to be supplied]"],
] as const;

export function SvcFooter({ prefix }: { prefix: string }) {
  const p = (path: string) => `${prefix}${path}`;

  return (
    <footer className="bg-svc-ink text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2">
              <Image src="/svc/logo-mark.png" alt="" width={36} height={36} />
              <span className="font-svc-heading text-base font-bold">Smart Value Club</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              A South African membership club. Real coupons for the stores you
              already shop at, delivered on the 1st of every month.
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm">
            <Link href={p("/how-it-works")} className="min-h-6 text-white/80 hover:text-svc-amber">How it works</Link>
            <Link href={p("/packages")} className="min-h-6 text-white/80 hover:text-svc-amber">Packages</Link>
            <Link href={p("/about")} className="min-h-6 text-white/80 hover:text-svc-amber">About</Link>
            <Link href={p("/faq")} className="min-h-6 text-white/80 hover:text-svc-amber">FAQ</Link>
            <Link href={p("/help")} className="min-h-6 text-white/80 hover:text-svc-amber">Help Centre</Link>
            <Link href={p("/contact")} className="min-h-6 text-white/80 hover:text-svc-amber">Contact</Link>
            <Link href={p("/join")} className="min-h-6 text-white/80 hover:text-svc-amber">Join now</Link>
            <Link href={p("/terms")} className="min-h-6 text-white/80 hover:text-svc-amber">Terms and conditions</Link>
            <Link href={p("/privacy")} className="min-h-6 text-white/80 hover:text-svc-amber">Privacy policy</Link>
            <Link href={p("/popia-notice")} className="min-h-6 text-white/80 hover:text-svc-amber">POPIA notice</Link>
          </nav>
        </div>

        <div className="mt-10 border-t border-white/15 pt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-white/50">
            Company information
          </h2>
          <dl className="mt-3 grid gap-x-8 gap-y-1 text-xs text-white/50 sm:grid-cols-2">
            {COMPANY_DETAILS_PENDING.map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <dt className="shrink-0 font-semibold">{label}:</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-xs text-white/50">
            {new Date().getFullYear()} Smart Value Club. All rights reserved. smartvalueclub.co.za
          </p>
        </div>
      </div>
    </footer>
  );
}
