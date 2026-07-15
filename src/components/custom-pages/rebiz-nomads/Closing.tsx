import Link from "next/link";

// Consolidated Sprint Sec 3.1: same fix as Hero.tsx — this page had two
// separate "Message Us on WhatsApp to Join" CTAs, both replaced with a
// real path to actually becoming a member.
export function Closing() {
  return (
    <footer className="flex flex-col items-center gap-8 bg-brand-dark px-6 py-24 text-center text-white">
      <p className="max-w-xl text-2xl font-bold tracking-tight">
        Your page + a real business network.
        <br />
        One membership.
      </p>

      <Link
        href="/pricing"
        className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-brand-dark shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-gray-100"
      >
        Join DigitalFlyer Growth to Unlock This →
      </Link>

      <div className="mt-6 flex flex-col items-center gap-1 border-t border-white/15 pt-8 text-xs text-white/60">
        <p className="text-base font-bold text-white/90">RE:Biz Nomads</p>
        <p>Powered by DigitalFlyer SA</p>
        <p className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <a href="mailto:dewald@digitalflyer.co.za" className="underline-offset-2 hover:text-white hover:underline">
            dewald@digitalflyer.co.za
          </a>
        </p>
        <p className="mt-2 flex items-center justify-center gap-3">
          <Link href="/privacy" className="underline-offset-2 hover:text-white hover:underline">
            Privacy Policy
          </Link>
          <span aria-hidden>&middot;</span>
          <Link href="/terms" className="underline-offset-2 hover:text-white hover:underline">
            Terms &amp; Conditions
          </Link>
        </p>
      </div>
    </footer>
  );
}
