import Image from "next/image";
import Link from "next/link";

// The DigitalFlyer wordmark (icon + "Digital" sans + "Flyer" script) is the
// established mark — left untouched, not redrawn or reinterpreted. "Growth"
// reads as a distinct product/channel within it, not a continuation of the
// wordmark, so it gets its own condensed/uppercase treatment set apart by a
// divider rather than being squeezed into either of the logo's two fonts.
export function BrandHeader({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3">
      <Image src="/brand/logo-blue.png" alt="DigitalFlyer" width={160} height={44} priority className="h-8 w-auto" />
      <span className="h-6 w-px bg-gray-300" aria-hidden />
      <span className="font-badge text-lg uppercase tracking-widest text-brand">Growth</span>
    </Link>
  );
}
