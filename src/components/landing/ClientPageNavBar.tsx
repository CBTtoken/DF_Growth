import Image from "next/image";
import Link from "next/link";

// Real client pages (both the standard templates and custom pages like
// RE:Biz Nomads/standing365) had literally no navigation at all — a visitor
// who lands on a business's page has no way back to browse other listings
// short of the browser's own back button. Deliberately minimal and neutral
// (not tied to the client's own brand color, which varies per client) so it
// doesn't compete with the business's own hero/branding directly below it —
// this is a utility strip, not a second marketing header. No pricing CTA or
// login link here on purpose: the audience for a live client page is that
// business's own customers, not a prospective DigitalFlyer client.
export function ClientPageNavBar() {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-2 text-xs sm:px-6">
      <Link href="/pricing" className="flex shrink-0 items-center gap-2 opacity-80 transition hover:opacity-100">
        <Image src="/brand/logo-blue.png" alt="DigitalFlyer" width={100} height={28} className="h-4 w-auto" />
        <span className="font-badge uppercase tracking-widest text-brand">Growth</span>
      </Link>
      <Link href="/marketplace" className="whitespace-nowrap font-semibold text-gray-500 transition hover:text-ink">
        ← Marketplace
      </Link>
    </div>
  );
}
